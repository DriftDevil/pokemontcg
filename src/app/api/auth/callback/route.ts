
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
    const state = cookieStore.get('oidc_state')?.value;

    if (!code_verifier) throw new Error('Missing code_verifier cookie');
    if (!nonce) throw new Error('Missing nonce cookie');
    if (!state) throw new Error('Missing state cookie');

    const appUrlFromEnv = process.env.APP_URL;
    const defaultDevAppUrl = `http://localhost:${process.env.PORT || '9002'}`;
    const callback_uri_base = appUrlFromEnv || defaultDevAppUrl;
    const redirect_uri = `${callback_uri_base}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, {
      code_verifier,
      nonce,
      state,
    });

    if (!tokenSet.id_token) throw new Error('ID token not found in token set');
    if (!tokenSet.access_token) throw new Error('Access token not found in token set');

    // Determine cookie security settings based on the effective URL scheme
    const cookieSecure = callback_uri_base.startsWith('https://');
    const cookieSameSite = 'lax'; // Use Lax as a robust default

    console.log(`[API OIDC Callback] Effective APP_URL for session cookies: ${callback_uri_base}. Setting cookies: Secure=${cookieSecure}, SameSite=${cookieSameSite}.`);
    if (process.env.NODE_ENV !== 'development' && !cookieSecure && appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
      console.warn(`[API OIDC Callback - Non-Dev] WARNING: APP_URL (${appUrlFromEnv}) is HTTP. Session cookies will be insecure.`);
    }


    const baseCookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, // 1 hour or token's expiry
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };

    const idTokenCookie: ResponseCookie = { name: 'id_token', value: tokenSet.id_token, ...baseCookieOpts } as ResponseCookie;
    const sessionTokenCookie: ResponseCookie = { name: 'session_token', value: tokenSet.access_token, ...baseCookieOpts } as ResponseCookie;

    cookieStore.set(idTokenCookie);
    cookieStore.set(sessionTokenCookie);

    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');

    const finalRedirectUrl = callback_uri_base; // Base URL for redirecting to dashboard
    return NextResponse.redirect(new URL('/admin/dashboard', finalRedirectUrl));
  } catch (error) {
    console.error('OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) errorMessage = error.message;

    const cookieStore = cookies();
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');
    cookieStore.delete('id_token');
    cookieStore.delete('session_token');

    const errorRedirectAppUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || '9002'}`;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
    