
'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

// Define a simple user type for the application
interface AppUser {
  id: string;
  name?: string; // From OIDC 'name' or API 'username'
  email?: string;
  picture?: string; // From OIDC 'picture'
  username?: string; // From API User schema
}

// External User schema from API (subset based on openapi.yaml /user/me)
interface ApiUser {
    id: string;
    email: string;
    username: string;
    createdAt: string; // date-time
}


const EXTERNAL_API_BASE_URL = process.env.EXTERNAL_API_BASE_URL;

export async function GET() {
  const idTokenCookie = cookies().get('id_token');
  const passwordAccessTokenCookie = cookies().get('password_access_token');

  if (idTokenCookie?.value) {
    try {
      const idToken = idTokenCookie.value;
      // In a real app with openid-client, token is already validated during callback.
      // Here we just decode it. For stronger security, re-verify with JWKS if not relying on prior validation.
      const claims = jose.decodeJwt(idToken);

      if (!claims || !claims.sub) {
          throw new Error('Invalid ID token claims');
      }

      const user: AppUser = {
        id: claims.sub,
        name: claims.name as string | undefined,
        email: claims.email as string | undefined,
        picture: claims.picture as string | undefined,
        username: claims.preferred_username as string | undefined || claims.name as string | undefined,
      };
      return NextResponse.json(user);
    } catch (error) {
      console.error('Error processing OIDC ID token:', error);
      // Clear potentially invalid token
      cookies().delete('id_token');
      cookies().delete('access_token'); // Also clear related OIDC access token
      // Fall through to check for password_access_token or return null
    }
  }

  if (passwordAccessTokenCookie?.value) {
    if (!EXTERNAL_API_BASE_URL) {
        console.error('EXTERNAL_API_BASE_URL not set. Cannot fetch user details for password session.');
        return NextResponse.json(null, { status: 500 });
    }
    try {
        const token = passwordAccessTokenCookie.value;
        const response = await fetch(`${EXTERNAL_API_BASE_URL}/user/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to fetch user from /user/me: ${response.status}`, errorBody);
            if (response.status === 401) { // Token likely invalid or expired
                cookies().delete('password_access_token');
            }
            return NextResponse.json(null, { status: response.status === 401 ? 401 : 500 });
        }

        const responseData: { data: ApiUser } = await response.json();
        const apiUser = responseData.data;

        if (!apiUser) {
            throw new Error('User data not found in /user/me response');
        }
        
        const user: AppUser = {
            id: apiUser.id,
            name: apiUser.username, // Use username as name for password auth
            email: apiUser.email,
            username: apiUser.username,
            // picture: not available from this API endpoint directly
        };
        return NextResponse.json(user);

    } catch (error) {
        console.error('Error fetching user for password session:', error);
        // Potentially clear cookie if there's a persistent error
        // cookies().delete('password_access_token');
        return NextResponse.json(null, { status: 500 });
    }
  }

  return NextResponse.json(null, { status: 200 }); // No user session
}
