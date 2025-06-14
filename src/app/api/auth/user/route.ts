
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
interface ExternalApiUser { // Renamed from ApiUser to avoid confusion with openapi.yaml's User
    id: string;
    email?: string;
    name?: string; // Directly from openapi.yaml User schema
    preferredUsername?: string; // From openapi.yaml User schema
    isAdmin?: boolean; // From openapi.yaml User schema
    createdAt?: string; // From openapi.yaml User schema
    lastSeen?: string; // From openapi.yaml User schema
}

// Represents the structure of the response from /auth/local/me which is UserWithAuthSource
interface ExternalApiUserResponse { // Renamed from ApiUserResponse
    data: ExternalApiUser;
    authSource: 'local' | 'oidc'; // This authSource is from the external API, might differ from our app's
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET() {
  const cookieStore = cookies();
  const idTokenCookie = cookieStore.get('id_token');
  const sessionTokenCookie = cookieStore.get('session_token');
  console.log(`[API User] Received request. ID Token present: ${!!idTokenCookie?.value}, Session Token present: ${!!sessionTokenCookie?.value}`);

  if (idTokenCookie?.value) {
    try {
      const idTokenValue = idTokenCookie.value;
      // Attempt to decode. If this fails, it will throw, and we'll catch it.
      const claims = jose.decodeJwt(idTokenValue); 

      if (claims && claims.sub && claims.iss) { // OIDC token MUST have an issuer (iss)
        console.log("[API User] Valid OIDC ID token decoded. Claims sub:", claims.sub);
        const user: AppUser = {
          id: claims.sub,
          name: (claims.name as string | undefined) || (claims.preferred_username as string | undefined),
          email: claims.email as string | undefined,
          picture: claims.picture as string | undefined,
          isAdmin: (claims.is_admin as boolean | undefined) || (claims.groups as string[])?.includes('admin'),
          authSource: 'oidc',
        };
        return NextResponse.json(user);
      } else {
        console.warn('[API User] OIDC ID token present but claims are invalid (missing sub or iss). Falling back if session_token exists.');
        // Do not return here, fall through to session_token check
      }
    } catch (error) {
      console.error('[API User] Error decoding OIDC ID token (it might be malformed or not a JWT):', error instanceof Error ? error.message : String(error), '. Falling back if session_token exists.');
      // Do not return here, fall through to session_token check
    }
  }

  // If no valid OIDC session, try local session via session_token
  if (sessionTokenCookie?.value) {
    console.log("[API User] No valid OIDC token or OIDC check failed. Attempting local session with session_token.");
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] EXTERNAL_API_BASE_URL not set. Cannot fetch user details for local session.');
        // Clear potentially stale session_token if we can't verify it
        // cookieStore.delete('session_token'); // Deleting cookies in a GET can be complex. Better to let client handle relogin.
        return NextResponse.json(null, { status: 500, statusText: "Server configuration error: API base URL not set." });
    }
    try {
        const token = sessionTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/auth/local/me`;
        console.log(`[API User] Fetching user from external API: ${externalUserUrl}`);
        
        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', 
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "Could not read error body");
            console.error(`[API User] Failed to fetch user from ${externalUserUrl} for local session: ${response.status}. Body: ${errorBody.substring(0,300)}`);
            if (response.status === 401 || response.status === 403) { 
                console.log("[API User] External API returned 401/403 for session_token. Deleting local session_token cookie.");
                const clearCookieResponse = NextResponse.json(null, { status: response.status });
                clearCookieResponse.cookies.delete('session_token'); 
                // Also delete id_token if it might be lingering and causing confusion, though primary issue is session_token here.
                clearCookieResponse.cookies.delete('id_token');
                return clearCookieResponse;
            }
            return NextResponse.json(null, { status: response.status });
        }
        
        const responseData: ExternalApiUserResponse = await response.json();
        
        if (!responseData || !responseData.data || !responseData.data.id) {
            console.error('[API User] User data, data field, or user ID not found in /auth/local/me response for local session. Response:', responseData);
            return NextResponse.json(null, { status: 500, statusText: "Invalid user data from authentication service." });
        }
        const externalUser = responseData.data;
        console.log("[API User] Local session user fetched successfully. User ID:", externalUser.id);
        
        const user: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            isAdmin: externalUser.isAdmin,
            authSource: 'local', 
        };
        return NextResponse.json(user);

    } catch (error: any) {
        console.error('[API User] Error during local session user fetch:', error.message ? error.message : String(error));
        return NextResponse.json({ message: "Error fetching user details for local session", details: error.message || String(error) }, { status: 500 });
    }
  }

  // If neither OIDC with 'iss' nor local session_token led to a user
  console.log("[API User] No valid OIDC or local session token found. Returning null (user not authenticated).");
  return NextResponse.json(null); 
}

