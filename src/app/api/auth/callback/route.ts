
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

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
    });

    if (!tokenSet.id_token) {
        throw new Error('ID token not found in token set');
    }
    if (!tokenSet.access_token) {
        throw new Error('Access token not found in token set');
    }
    
    const currentAppUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || '9002'}`;
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecureContext = isProduction && currentAppUrl.startsWith('https://');
    
    const cookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, // Use token expiry or default to 1 hour
    };

    if (isSecureContext) { // Production HTTPS
        cookieOpts.secure = true;
        cookieOpts.sameSite = 'lax'; // Corrected: "Lax" to "lax"
        // For production on a single hostname, explicitly setting domain is usually not needed,
        // and omitting it makes the cookie a "host-only" cookie.
    } else { // Development (HTTP) or non-secure production (like http://localhost)
        cookieOpts.secure = false;
        // For localhost HTTP, omit SameSite attribute. Next.js defaults to 'Lax',
        // but omitting can sometimes bypass browser blocking issues if the default 'Lax'
        // is problematic for POST + fetch.
        // If we were to set it explicitly, it would be 'lax'.
    }
    
    const idTokenCookie: ResponseCookie = {
        name: 'id_token',
        value: tokenSet.id_token,
        ...cookieOpts
    } as ResponseCookie;

    const sessionTokenCookie: ResponseCookie = {
        name: 'session_token',
        value: tokenSet.access_token,
        ...cookieOpts
    } as ResponseCookie;

    console.log(`[API OIDC Callback] Setting 'id_token' cookie with options: ${JSON.stringify(idTokenCookie)} (isSecureContext: ${isSecureContext})`);
    (await cookies()).set(idTokenCookie);
    console.log(`[API OIDC Callback] Setting 'session_token' cookie with options: ${JSON.stringify(sessionTokenCookie)} (isSecureContext: ${isSecureContext})`);
    (await cookies()).set(sessionTokenCookie);
    
    (await cookies()).delete('oidc_code_verifier');
    (await cookies()).delete('oidc_nonce');

    return NextResponse.redirect(new URL('/admin/dashboard', appUrl));
  } catch (error) {
    console.error('OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    (await cookies()).delete('oidc_code_verifier');
    (await cookies()).delete('oidc_nonce');
    (await cookies()).delete('id_token');
    (await cookies()).delete('session_token');
    const errorRedirectAppUrl = process.env.APP_URL || 'http://localhost:9002';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
    
