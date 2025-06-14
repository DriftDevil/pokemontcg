
'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

// User representation within this Next.js app (client-side and API response)
interface AppUser {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
  isAdmin?: boolean;
  authSource: 'oidc' | 'local';
}

// Represents the structure of the User object from the external API's /auth/local/me
interface ExternalApiUser {
    id: string;
    email?: string;
    name?: string;
    preferredUsername?: string;
    isAdmin?: boolean;
    createdAt?: string;
    lastSeen?: string;
}

// Represents the structure of the response from /auth/local/me which is UserWithAuthSource
interface ExternalApiUserResponse {
    data: ExternalApiUser;
    authSource: 'local' | 'oidc';
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET() {
  const cookieStore = cookies();
  
  // Enhanced logging for all received cookies
  const allCookiesArray = cookieStore.getAll().map(c => ({ 
    name: c.name, 
    valueExists: !!c.value, 
    valueSnippet: c.value ? c.value.substring(0,15)+'...' : 'N/A',
    // path: c.path, // May not be available in Next.js 13+ cookies() directly, but good for context if it were
    // domain: c.domain, // Same as above
    // secure: c.secure, // Same as above
    // httpOnly: c.httpOnly, // Same as above
    // sameSite: c.sameSite // Same as above
  }));
  console.log(`[API User - GET /api/auth/user] START. Received cookies (name, valueExists, snippet):`, JSON.stringify(allCookiesArray, null, 2));

  const idTokenCookie = cookieStore.get('id_token');
  const sessionTokenCookie = cookieStore.get('session_token');

  console.log(`[API User] Parsed ID Token cookie exists: ${!!idTokenCookie?.value}, Parsed Session Token cookie exists: ${!!sessionTokenCookie?.value}`);

  if (idTokenCookie?.value) {
    console.log("[API User] Attempting to process OIDC ID token.");
    try {
      const idTokenValue = idTokenCookie.value;
      const claims = jose.decodeJwt(idTokenValue);
      console.log("[API User] OIDC ID token decoded. Claims (sub, iss, name, email, preferred_username, picture, is_admin, groups):", 
        { 
          sub: claims.sub, 
          iss: claims.iss, 
          name: claims.name, 
          email: claims.email,
          preferred_username: claims.preferred_username,
          picture: claims.picture,
          is_admin: claims.is_admin,
          groups: claims.groups
        });

      if (claims && claims.sub && claims.iss) { // OIDC token MUST have an issuer (iss)
        console.log("[API User] OIDC ID token claims are valid (sub & iss present).");
        const user: AppUser = {
          id: claims.sub,
          name: (claims.name as string | undefined) || (claims.preferred_username as string | undefined),
          email: claims.email as string | undefined,
          picture: claims.picture as string | undefined,
          isAdmin: (claims.is_admin as boolean | undefined) || (Array.isArray(claims.groups) && (claims.groups as string[]).includes('admin')),
          authSource: 'oidc',
        };
        console.log("[API User] OIDC user constructed. Returning user:", user);
        return NextResponse.json(user);
      } else {
        console.warn('[API User] OIDC ID token present but claims are invalid (missing sub or iss). Decoded Claims:', claims, 'Falling back if session_token exists.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API User] Error decoding OIDC ID token: ${errorMessage}. Token snippet: ${idTokenCookie.value.substring(0, 30)}... Falling back if session_token exists.`);
    }
  } else {
    console.log("[API User] No OIDC ID token cookie found or its value is empty.");
  }

  // If no valid OIDC session, try local session via session_token
  if (sessionTokenCookie?.value) {
    console.log("[API User] No valid OIDC token or OIDC check failed. Attempting local session with session_token.");
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] CRITICAL: EXTERNAL_API_BASE_URL not set. Cannot fetch user details for local session. Returning null.');
        return NextResponse.json(null, { status: 500, statusText: "Server configuration error: API base URL not set." });
    }
    try {
        const token = sessionTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/auth/local/me`;
        console.log(`[API User] Fetching user from external API: ${externalUserUrl} with token (snippet): ${token.substring(0,15)}...`);

        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        console.log(`[API User] Response status from ${externalUserUrl}: ${response.status}`);
        const responseBodyText = await response.text(); 

        if (!response.ok) {
            console.error(`[API User] Failed to fetch user from ${externalUserUrl} for local session. Status: ${response.status}. Response Body: ${responseBodyText.substring(0,300)}`);
            if (response.status === 401 || response.status === 403) {
                console.log("[API User] External API returned 401/403 for session_token. Deleting local session_token and id_token cookies.");
                const clearCookieResponse = NextResponse.json({ message: "Session token invalid, cleared by /api/auth/user." }, { status: response.status }); 
                clearCookieResponse.cookies.delete('session_token');
                clearCookieResponse.cookies.delete('id_token'); 
                return clearCookieResponse;
            }
            console.log("[API User] External API error was not 401/403. Returning null.");
            return NextResponse.json({ message: `Error from external auth service: ${response.status}`, details: responseBodyText.substring(0,300) }, { status: response.status });
        }
        
        let responseData: ExternalApiUserResponse;
        try {
            responseData = JSON.parse(responseBodyText);
        } catch (parseError) {
            console.error(`[API User] Failed to parse JSON response from ${externalUserUrl}. Body: ${responseBodyText.substring(0,300)}... Returning null.`);
            return NextResponse.json(null, { status: 502, statusText: "Invalid JSON response from authentication service." });
        }
        
        console.log("[API User] External API /auth/local/me response data (parsed):", responseData);

        if (!responseData || !responseData.data || !responseData.data.id) {
            console.error('[API User] User data, data field, or user ID not found in /auth/local/me response for local session. Parsed response body:', responseData, 'Returning null.');
            return NextResponse.json(null, { status: 500, statusText: "Invalid user data format from authentication service." });
        }
        const externalUser = responseData.data;
        console.log("[API User] Local session user fetched successfully from external API. External User ID:", externalUser.id);

        const user: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            isAdmin: externalUser.isAdmin,
            authSource: 'local',
        };
        console.log("[API User] Local user constructed. Returning user:", user);
        return NextResponse.json(user);

    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        console.error(`[API User] Error during local session user fetch: ${errorMessage}. Stack: ${error.stack ? error.stack.substring(0, 500) : 'N/A'}. Returning null.`);
        return NextResponse.json({ message: "Internal server error fetching user details for local session.", details: errorMessage }, { status: 500 });
    }
  } else {
     console.log("[API User] No local session_token cookie found or its value is empty.");
  }

  console.log("[API User] END. No valid OIDC or local session token led to a user. Returning null (user not authenticated).");
  return NextResponse.json(null);
}
    
