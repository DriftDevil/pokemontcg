'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import * as jose from 'jose';

export async function GET(request: NextRequest) {
  try {
    const client = await getOidcClient();
    const searchParams = request.nextUrl.searchParams;
    
    const code_verifier = (await cookies()).get('oidc_code_verifier')?.value;
    const nonce = (await cookies()).get('oidc_nonce')?.value;

    if (!code_verifier) {
      throw new Error('Missing code_verifier cookie');
    }
    if (!nonce) {
        throw new Error('Missing nonce cookie');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const redirect_uri = `${appUrl}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, { 
      code_verifier,
      nonce,
      // response_type: 'code' // already implied by client config
    });

    if (!tokenSet.id_token) {
        throw new Error('ID token not found in token set');
    }

    // Optional: Validate ID token further if needed (openid-client does basic validation)
    // Example: const claims = await jose.jwtVerify(tokenSet.id_token, ...)
    // For now, we trust openid-client's validation based on discovered JWKS
    const claims = tokenSet.claims(); // Decoded claims

    (await cookies()).set('id_token', tokenSet.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
      maxAge: tokenSet.expires_in || 3600, // Use token expiry or default to 1 hour
    });

    if (tokenSet.access_token) {
      (await cookies()).set('access_token', tokenSet.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: tokenSet.expires_in || 3600,
      });
    }
    
    // Clean up PKCE and nonce cookies
    (await
      // Clean up PKCE and nonce cookies
      cookies()).delete('oidc_code_verifier');
    (await cookies()).delete('oidc_nonce');

    return NextResponse.redirect(new URL('/admin/dashboard', appUrl));
  } catch (error) {
    console.error('Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Clear potentially partial cookies on error
    (await
      // Clear potentially partial cookies on error
      cookies()).delete('oidc_code_verifier');
    (await cookies()).delete('oidc_nonce');
    (await cookies()).delete('id_token');
    (await cookies()).delete('access_token');
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, process.env.APP_URL || 'http://localhost:9002'));
  }
}
