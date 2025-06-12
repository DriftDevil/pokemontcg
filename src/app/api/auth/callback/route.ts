
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function GET(request: NextRequest) {
  try {
    const client = await getOidcClient();
    const searchParams = request.nextUrl.searchParams;
    
    const cookieStore = cookies();
    const code_verifier = cookieStore.get('oidc_code_verifier')?.value;
    const nonce = cookieStore.get('oidc_nonce')?.value;
    const state = cookieStore.get('oidc_state')?.value; // Retrieve state from cookie

    if (!code_verifier) {
      throw new Error('Missing code_verifier cookie');
    }
    if (!nonce) {
        throw new Error('Missing nonce cookie');
    }
    if (!state) {
        throw new Error('Missing state cookie');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const redirect_uri = `${appUrl}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, { 
      code_verifier,
      nonce,
      state, // Pass retrieved state for verification
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
    
    const baseCookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, // Use token expiry or default to 1 hour
    };

    if (isSecureContext) { // Production HTTPS
        baseCookieOpts.secure = true;
        baseCookieOpts.sameSite = 'lax';
    } else { // Development (HTTP) or non-secure production
        baseCookieOpts.secure = false;
        // For localhost HTTP, omitting SameSite (which means browser defaults to Lax)
        // or explicitly setting to 'lax' if Next.js doesn't default.
        // If Next.js defaults to Lax, explicitly setting 'undefined' might be needed if 'Lax' is still blocked by browser for POST->fetch.
        // Given the previous issues with POST and SameSite=Lax, let's try omitting it for non-secure contexts explicitly.
        baseCookieOpts.sameSite = undefined;
    }
    
    const idTokenCookie: ResponseCookie = {
        name: 'id_token',
        value: tokenSet.id_token,
        ...baseCookieOpts
    } as ResponseCookie;

    const sessionTokenCookie: ResponseCookie = {
        name: 'session_token',
        value: tokenSet.access_token,
        ...baseCookieOpts
    } as ResponseCookie;

    console.log(`[API OIDC Callback] Setting 'id_token' cookie with options: ${JSON.stringify(idTokenCookie)} (isSecureContext: ${isSecureContext})`);
    cookieStore.set(idTokenCookie);
    console.log(`[API OIDC Callback] Setting 'session_token' cookie with options: ${JSON.stringify(sessionTokenCookie)} (isSecureContext: ${isSecureContext})`);
    cookieStore.set(sessionTokenCookie);
    
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state'); // Delete state cookie

    return NextResponse.redirect(new URL('/admin/dashboard', appUrl));
  } catch (error) {
    console.error('OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    const cookieStore = cookies();
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');
    cookieStore.delete('id_token');
    cookieStore.delete('session_token');
    const errorRedirectAppUrl = process.env.APP_URL || 'http://localhost:9002';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
