
'use server';
import { NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { generators } from 'openid-client';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function GET() {
  try {
    const client = await getOidcClient();
    const code_verifier = generators.codeVerifier();
    const code_challenge = generators.codeChallenge(code_verifier);
    const nonce = generators.nonce();
    const state = generators.state();

    let effectiveAppUrl: string;
    const appUrlFromEnv = process.env.APP_URL;

    if (appUrlFromEnv) {
      effectiveAppUrl = appUrlFromEnv;
    } else {
      if (process.env.NODE_ENV === 'development') {
        const port = process.env.PORT || '9002';
        effectiveAppUrl = `http://localhost:${port}`;
        console.log(`[API OIDC Login] APP_URL not set, NODE_ENV is development. Defaulting effectiveAppUrl for OIDC state cookies to ${effectiveAppUrl}`);
      } else {
        console.error(`[API OIDC Login] CRITICAL: APP_URL is not set in a non-development environment (${process.env.NODE_ENV}). OIDC state cookie settings will likely be incorrect, expecting an HTTPS URL. Defaulting to http://localhost:9002 for context, but this requires correction by setting APP_URL.`);
        effectiveAppUrl = 'http://localhost:9002'; // Fallback that will likely lead to Secure=false
      }
    }
    
    const redirect_uri = `${effectiveAppUrl}/api/auth/callback`;

    const cookieSecure = effectiveAppUrl.startsWith('https://');
    const cookieSameSite = 'lax'; 

    console.log(`[API OIDC Login] Effective APP_URL for OIDC state cookies: ${effectiveAppUrl}. Setting cookies: Secure=${cookieSecure}, SameSite=${cookieSameSite}. Redirect URI: ${redirect_uri}`);
    if (process.env.NODE_ENV !== 'development' && !cookieSecure && appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
      console.warn(`[API OIDC Login - Non-Dev] WARNING: APP_URL (${appUrlFromEnv}) is HTTP. OIDC state cookies will be insecure.`);
    }
     if (process.env.NODE_ENV !== 'development' && !appUrlFromEnv) {
      console.warn(`[API OIDC Login - Non-Dev] WARNING: APP_URL is NOT SET. OIDC state cookies will be based on a default ${effectiveAppUrl} and likely insecure if an HTTPS URL is expected.`);
    }


    const cookieOptions: Omit<ResponseCookie, 'name' | 'value'> = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };

    const cookieStore = await cookies();
    cookieStore.set('oidc_code_verifier', code_verifier, cookieOptions);
    cookieStore.set('oidc_nonce', nonce, cookieOptions);
    cookieStore.set('oidc_state', state, cookieOptions);

    const authorizationUrl = client.authorizationUrl({
      scope: 'openid email profile',
      redirect_uri,
      code_challenge,
      code_challenge_method: 'S256',
      nonce,
      state,
    });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('Login route error:', error);
    let errorMessage = 'OIDC login initiation failed.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Determine error redirect base URL robustly
    let errorRedirectBaseUrl = 'http://localhost:9002'; // Ultimate fallback
    const appUrlForErrorRedirect = process.env.APP_URL;
    if (appUrlForErrorRedirect) {
        errorRedirectBaseUrl = appUrlForErrorRedirect;
    } else if (process.env.NODE_ENV === 'development') {
        const port = process.env.PORT || '9002';
        errorRedirectBaseUrl = `http://localhost:${port}`;
    }
    // In non-dev, if APP_URL is not set, redirecting to localhost is not ideal but better than crashing.
    // The core issue (missing APP_URL) should be addressed.

    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectBaseUrl));
  }
}
    
