
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const CONTEXT = "API OIDC Callback";
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

    let effectiveAppUrl: string;
    const appUrlFromEnv = process.env.APP_URL;

    if (appUrlFromEnv) {
      effectiveAppUrl = appUrlFromEnv;
    } else {
      if (process.env.NODE_ENV === 'development') {
        const port = process.env.PORT || '9002';
        effectiveAppUrl = `http://localhost:${port}`;
        logger.info(CONTEXT, `APP_URL not set, NODE_ENV is development. Defaulting effectiveAppUrl for OIDC session cookies to ${effectiveAppUrl}`);
      } else {
        logger.error(CONTEXT, `CRITICAL: APP_URL is not set in a non-development environment (${process.env.NODE_ENV}). OIDC session cookie settings will likely be incorrect, expecting an HTTPS URL. Defaulting to http://localhost:9002 for context, but this requires correction by setting APP_URL.`);
        effectiveAppUrl = 'http://localhost:9002'; // Fallback that will likely lead to Secure=false
      }
    }
    
    const redirect_uri = `${effectiveAppUrl}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, {
      code_verifier,
      nonce,
      state,
    });

    if (!tokenSet.id_token) throw new Error('ID token not found in token set');
    if (!tokenSet.access_token) throw new Error('Access token not found in token set');

    const cookieSecure = effectiveAppUrl.startsWith('https://');
    const cookieSameSite = 'lax'; 

    logger.info(CONTEXT, `Effective APP_URL for session cookies: ${effectiveAppUrl}. Setting cookies: Secure=${cookieSecure}, SameSite=${cookieSameSite}, Max-Age=${tokenSet.expires_in || 3600}.`);
    if (process.env.NODE_ENV !== 'development' && !cookieSecure && appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
      logger.warn(CONTEXT, `Non-Dev WARNING: APP_URL (${appUrlFromEnv}) is HTTP. Session cookies will be insecure.`);
    }
    if (process.env.NODE_ENV !== 'development' && !appUrlFromEnv) {
      logger.warn(CONTEXT, `Non-Dev WARNING: APP_URL is NOT SET. Session cookies will be based on a default ${effectiveAppUrl} and likely insecure if an HTTPS URL is expected.`);
    }

    const baseCookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, 
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

    return NextResponse.redirect(new URL('/admin/dashboard', effectiveAppUrl));
  } catch (error) {
    logger.error(CONTEXT, 'OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) errorMessage = error.message;

    const cookieStore = cookies();
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');
    cookieStore.delete('id_token');
    cookieStore.delete('session_token');

    let errorRedirectBaseUrl = 'http://localhost:9002'; 
    const appUrlForErrorRedirect = process.env.APP_URL;
    if (appUrlForErrorRedirect) {
        errorRedirectBaseUrl = appUrlForErrorRedirect;
    } else if (process.env.NODE_ENV === 'development') {
        const port = process.env.PORT || '9002';
        errorRedirectBaseUrl = `http://localhost:${port}`;
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectBaseUrl));
  }
}
