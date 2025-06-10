
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

  if (idTokenCookie?.value) {
    try {
      const idTokenValue = idTokenCookie.value;
      const claims = jose.decodeJwt(idTokenValue); 

      if (claims && claims.sub && claims.iss) { // OIDC token MUST have an issuer
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
        console.warn('[API User] OIDC ID token present but invalid or missing sub/iss. Falling back if session_token exists.');
      }
    } catch (error) {
      console.error('[API User] Error processing OIDC ID token:', error);
      // Don't immediately return error; fall through to check session_token for local auth
    }
  }

  // If no valid OIDC session, try local session via session_token
  if (sessionTokenCookie?.value) {
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] EXTERNAL_API_BASE_URL not set. Cannot fetch user details for local session.');
        // Clear potentially stale session_token if we can't verify it
        cookieStore.delete('session_token');
        return NextResponse.json(null, { status: 500 });
    }
    try {
        const token = sessionTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/auth/local/me`;
        
        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', 
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[API User] Failed to fetch user from ${externalUserUrl} for local session: ${response.status}`, errorBody);
            if (response.status === 401 || response.status === 403) { 
                cookieStore.delete('session_token'); // Token is invalid/expired
            }
            return NextResponse.json(null, { status: response.status });
        }
        
        const responseData: ExternalApiUserResponse = await response.json();
        
        if (!responseData || !responseData.data) {
            console.error('[API User] User data or data field not found in /auth/local/me response for local session. Response:', responseData);
            return NextResponse.json(null, { status: 500 });
        }
        const externalUser = responseData.data;
        
        const user: AppUser = {
            id: externalUser.id,
            name: externalUser.name || externalUser.preferredUsername,
            email: externalUser.email,
            isAdmin: externalUser.isAdmin,
            authSource: 'local', 
            // picture is not typically available from a local password auth /me endpoint
        };
        return NextResponse.json(user);

    } catch (error: any) {
        console.error('[API User] Error fetching user for local session:', error);
        let errorMessage = 'Internal server error while fetching user for local session.';
        if (error.message) {
            errorMessage = error.message;
        }
        // Potentially clear cookie if there's a persistent error, but be cautious
        // cookieStore.delete('session_token'); 
        return NextResponse.json({ message: "Error fetching user details for local session", details: errorMessage }, { status: 500 });
    }
  }

  // If neither OIDC with 'iss' nor local session_token led to a user
  return NextResponse.json(null); 
}
