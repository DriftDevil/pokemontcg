
'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

// User representation within this Next.js app (client-side and API response)
interface AppUser {
  id: string;
  name?: string;
  email?: string;
  picture?: string; // From OIDC 'picture'
  isAdmin?: boolean; // Added from openapi.yaml User schema
  // preferredUsername can be mapped to name if primary display name is desired
}

// Represents the structure of the User object from the external API's /auth/local/me
// based on openapi.yaml components.schemas.User
interface ApiUser {
    id: string;
    email?: string;
    name?: string;
    preferredUsername?: string;
    isAdmin?: boolean;
    createdAt?: string;
    lastSeen?: string;
}

// Represents the structure of the response from /auth/local/me which is UserWithAuthSource
interface ApiUserResponse {
    data: ApiUser;
    authSource: 'local' | 'oidc';
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET() {
  const idTokenCookie = cookies().get('id_token');
  const passwordAccessTokenCookie = cookies().get('password_access_token');

  if (idTokenCookie?.value) {
    try {
      const idToken = idTokenCookie.value;
      const claims = jose.decodeJwt(idToken); // Assuming token is pre-validated by oidcClient

      if (!claims || !claims.sub) {
          console.warn('[API User] OIDC ID token invalid or missing sub.');
          cookies().delete('id_token');
          cookies().delete('access_token');
          return NextResponse.json(null, { status: 401 }); // Explicitly return null for unauthorized
      }

      const user: AppUser = {
        id: claims.sub,
        name: (claims.name as string | undefined) || (claims.preferred_username as string | undefined),
        email: claims.email as string | undefined,
        picture: claims.picture as string | undefined,
        isAdmin: (claims.is_admin as boolean | undefined) || (claims.groups as string[])?.includes('admin'), // Example: check custom claim or group
      };
      return NextResponse.json(user);
    } catch (error) {
      console.error('[API User] Error processing OIDC ID token:', error);
      cookies().delete('id_token');
      cookies().delete('access_token');
      return NextResponse.json(null, { status: 500 });
    }
  }

  if (passwordAccessTokenCookie?.value) {
    if (!EXTERNAL_API_BASE_URL) {
        console.error('[API User] EXTERNAL_API_BASE_URL not set. Cannot fetch user details for password session.');
        return NextResponse.json(null, { status: 500 });
    }
    try {
        const token = passwordAccessTokenCookie.value;
        const externalUserUrl = `${EXTERNAL_API_BASE_URL}/auth/local/me`;
        console.log(`[API User] Fetching user from external API: ${externalUserUrl}`);
        const response = await fetch(externalUserUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Ensure fresh data from external API
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[API User] Failed to fetch user from ${externalUserUrl}: ${response.status}`, errorBody);
            if (response.status === 401 || response.status === 403) { 
                cookies().delete('password_access_token');
            }
            // Return null for client to handle, status code helps client understand why
            return NextResponse.json(null, { status: response.status });
        }
        
        // Expecting UserWithAuthSource schema: { data: User, authSource: string }
        const responseData: ApiUserResponse = await response.json();
        
        if (!responseData || !responseData.data) {
            console.error('[API User] User data or data field not found in /auth/local/me response from external API. Response:', responseData);
            return NextResponse.json(null, { status: 500 });
        }
        const apiUser = responseData.data;
        
        const user: AppUser = {
            id: apiUser.id,
            name: apiUser.name || apiUser.preferredUsername,
            email: apiUser.email,
            isAdmin: apiUser.isAdmin,
            // picture is not typically available from a local password auth /me endpoint
        };
        return NextResponse.json(user);

    } catch (error: any) {
        console.error('[API User] Error fetching user for password session:', error);
        // Potentially clear cookie if there's a persistent error, but be cautious
        // cookies().delete('password_access_token'); 
        let errorMessage = 'Internal server error while fetching user for password session.';
        if (error.message) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: "Error fetching user details", details: errorMessage }, { status: 500 });
    }
  }

  return NextResponse.json(null); // No user session found, explicitly return null
}
