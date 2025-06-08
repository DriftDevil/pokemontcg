'use server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { getOidcClient } from '@/lib/oidcClient';

// Define a simple user type for the application
interface User {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

export async function GET() {
  const idTokenCookie = cookies().get('id_token');

  if (!idTokenCookie?.value) {
    return NextResponse.json(null, { status: 200 }); // No user session or not logged in
  }

  try {
    const idToken = idTokenCookie.value;
    // In a real app, you'd fetch JWKS from client.issuer.jwks_uri if not using client.CLOCK_TOLERANCE
    // For simplicity, openid-client already validated the token during callback.
    // Here we just decode it. For stronger security, re-verify with JWKS.
    const claims = jose.decodeJwt(idToken);

    if (!claims || !claims.sub) {
        throw new Error('Invalid ID token claims');
    }

    const user: User = {
      id: claims.sub,
      name: claims.name as string | undefined,
      email: claims.email as string | undefined,
      picture: claims.picture as string | undefined,
    };

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user session:', error);
    // Clear potentially invalid token
    cookies().delete('id_token');
    cookies().delete('access_token');
    return NextResponse.json(null, { status: 200 }); // Effectively logs them out on error
  }
}
