
'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

// User representation within this Next.js app (client-side and API response)
interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string; // Changed from picture to avatarUrl
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
    avatarUrl?: string; // Added avatarUrl
}

// Represents the structure of the response from /auth/local/me which is UserWithAuthSource
interface ExternalApiUserResponse {
    data: ExternalApiUser;
    authSource: 'local' | 'oidc';
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET() {
  const cookieStore = cookies();
  
  const receivedCookiesForLog: { [key: string]: string } = {};
  cookieStore.getAll().forEach(c => {
    receivedCookiesForLog[c.name] = c.value ? `${c.value.substring(0,15)}... (exists)` : 'EMPTY_OR_UNDEFINED';
  });
  console.log(`[API User - GET /api/auth/user] START. Received cookies:`, JSON.stringify(receivedCookiesForLog));

  const idTokenCookie = cookieStore.get('id_token');
  const sessionTokenCookie = cookieStore.get('session_token');

  console.log(`[API User] id_token cookie value exists: ${!!idTokenCookie?.value}, session_token cookie value exists: ${!!sessionTokenCookie?.value}`);

  if (idTokenCookie?.value) {
    console.log("[API User] Attempting to process OIDC ID token.");
    try {
      const idTokenValue = idTokenCookie.value;
      const claims = jose.decodeJwt(idTokenValue);
      console.log("[API User] OIDC ID token decoded. Relevant claims (sub, name, email, preferred_username, picture, avatarUrl, is_admin, groups):", 
        { 
          sub: claims.sub, 
          name: claims.name, 
          email: claims.email,
          preferred_username: claims.preferred_username,
          picture: claims.picture, // Keep logging original picture claim for reference
          avatarUrl: claims.avatarUrl || claims.picture, // Use avatarUrl if present, fallback to picture
          is_admin: claims.is_admin,
          groups: claims.groups
        });

      if (claims && claims.sub) {
        console.log("[API User] OIDC ID token claims appear valid (sub present).");
        const user: AppUser = {
          id: claims.sub,
          name: (claims.name as string | undefined) || (claims.preferred_username as string | undefined),
          email: claims.email as string | undefined,
          avatarUrl: (claims.avatarUrl || claims.picture) as string | undefined, // Use avatarUrl or picture
          isAdmin: (claims.is_admin === true) || (Array.isArray(claims.groups) && (claims.groups as string[]).includes('admin')),
          authSource: 'oidc',
        };
        console.log("[API User] OIDC user constructed. Returning user:", user);
        return NextResponse.json(user);
      } else {
        console.warn('[API User] OIDC ID token present but essential claims (sub) are missing. Decoded Claims:', claims, 'Falling back if session_token exists.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[API User] Error decoding OIDC ID token: ${errorMessage}. Token snippet: ${idTokenCookie.value.substring(0, 30)}... Clearing OIDC token and falling back if session_token exists.`);
      const errResponse = NextResponse.json(null, { status: 500, statusText: "Error processing OIDC token." });
      errResponse.cookies.delete('id_token'); // Clear invalid OIDC token
      // Do not return yet, proceed to check session_token
    }
  } else {
    console.log("[API User] No OIDC ID token cookie found or its value is empty.");
  }

  if (sessionTokenCookie?.value) {
    console.log("[API User] Attempting local session with session_token.");
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] CRITICAL: EXTERNAL_API_BASE_URL not set. Cannot fetch user details for local session. Returning null.');
        const errResponse = NextResponse.json(null, { status: 500, statusText: "Server configuration error: API base URL not set." });
        errResponse.cookies.delete('session_token');
        errResponse.cookies.delete('id_token');
        return errResponse;
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
        
        let responseData: ExternalApiUserResponse | null = null;
        try {
            if (responseBodyText) {
                responseData = JSON.parse(responseBodyText);
                console.log("[API User] External API /auth/local/me full parsed response data:", JSON.stringify(responseData, null, 2));
            } else {
                console.warn(`[API User] External API /auth/local/me returned an empty body. Status: ${response.status}`);
            }
        } catch (parseError) {
            console.error(`[API User] Failed to parse JSON response from ${externalUserUrl}. Status: ${response.status}. Body: ${responseBodyText.substring(0,300)}...`);
            // Only treat as session invalidation if response was OK but unparseable
            if (response.ok) {
                const clearCookieResponse = NextResponse.json(null, { status: 502, statusText: "Invalid JSON response from authentication service." });
                clearCookieResponse.cookies.delete('session_token');
                clearCookieResponse.cookies.delete('id_token');
                console.log("[API User] External API returned OK but unparseable JSON; clearing local session cookies.");
                return clearCookieResponse;
            }
            // For non-OK responses with parse errors, fall through to generic error handling
        }

        if (!response.ok) {
            console.error(`[API User] Failed to fetch user from ${externalUserUrl} for local session. Status: ${response.status}. Response Body (or parsed error if JSON): ${responseData ? JSON.stringify(responseData) : responseBodyText.substring(0,300)}`);
            const clearCookieResponse = NextResponse.json({ message: `Error from external auth service: ${response.status}`, details: responseData || responseBodyText.substring(0,300) }, { status: response.status }); 
            if (response.status === 401 || response.status === 403) {
                clearCookieResponse.cookies.delete('session_token');
                clearCookieResponse.cookies.delete('id_token'); 
                console.log("[API User] External API returned 401/403 for session_token. Deleting local session_token and id_token cookies.");
            }
            return clearCookieResponse;
        }
        
        if (!responseData || !responseData.data || !responseData.data.id) {
            console.warn('[API User] External API /auth/local/me returned 200 OK, but user data is missing, invalid, or indicates an anonymous user. Parsed response body was:', responseData, 'Treating as unauthenticated and clearing local session cookies.');
            const clearCookieResponse = NextResponse.json(null, { status: 200 }); 
            clearCookieResponse.cookies.delete('session_token');
            clearCookieResponse.cookies.delete('id_token');
            return clearCookieResponse;
        }

        const externalUser = responseData.data;
        console.log("[API User] Local session user fetched successfully from external API. External User ID:", externalUser.id, "isAdmin:", externalUser.isAdmin, "avatarUrl:", externalUser.avatarUrl);

        const user: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            avatarUrl: externalUser.avatarUrl, // Use avatarUrl from external API
            isAdmin: externalUser.isAdmin,
            authSource: responseData.authSource || 'local', // Use authSource from response if available
        };
        console.log("[API User] Local user constructed. Returning user:", user);
        return NextResponse.json(user);

    } catch (error: any) {
        const errorMessage = error.message ? error.message : String(error);
        console.error(`[API User] Error during local session user fetch: ${errorMessage}. Stack: ${error.stack ? error.stack.substring(0, 500) : 'N/A'}. Returning null.`);
        const errResponse = NextResponse.json({ message: "Internal server error fetching user details for local session.", details: errorMessage }, { status: 500 });
        errResponse.cookies.delete('session_token');
        errResponse.cookies.delete('id_token');
        return errResponse;
    }
  } else {
     console.log("[API User] No local session_token cookie found or its value is empty.");
  }

  console.log("[API User] END. No valid OIDC or local session token led to a user. Returning null (user not authenticated).");
  return NextResponse.json(null);
}
    
