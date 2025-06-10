
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function GET(request: NextRequest) {
  try {
    const client = await getOidcClient();
    const searchParams = request.nextUrl.searchParams;
    
    const code_verifier = cookies().get('oidc_code_verifier')?.value;
    const nonce = cookies().get('oidc_nonce')?.value;

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
    });

    if (!tokenSet.id_token) {
        throw new Error('ID token not found in token set');
    }
    if (!tokenSet.access_token) {
        throw new Error('Access token not found in token set');
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: Partial<ResponseCookie> = {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
      maxAge: tokenSet.expires_in || 3600, // Use token expiry or default to 1 hour
    };
    
    if (!isProduction) {
      cookieOptions.domain = 'localhost'; // Explicitly set for development
    }

    cookies().set('id_token', tokenSet.id_token, cookieOptions);
    cookies().set('session_token', tokenSet.access_token, cookieOptions);
    
    // Clean up PKCE and nonce cookies
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');

    return NextResponse.redirect(new URL('/admin/dashboard', appUrl));
  } catch (error) {
    console.error('OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Clear potentially partial cookies on error
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    cookies().delete('id_token');
    cookies().delete('session_token');
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, process.env.APP_URL || 'http://localhost:9002'));
  }
}

