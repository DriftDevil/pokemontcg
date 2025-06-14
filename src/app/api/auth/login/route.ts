
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

    const appUrlFromEnv = process.env.APP_URL;
    const defaultDevAppUrl = `http://localhost:${process.env.PORT || '9002'}`;
    const redirect_uri_base = appUrlFromEnv || defaultDevAppUrl;
    const redirect_uri = `${redirect_uri_base}/api/auth/callback`;

    // Determine cookie security settings based on the effective URL scheme
    const cookieSecure = redirect_uri_base.startsWith('https://');
    const cookieSameSite = 'lax'; 

    console.log(`[API OIDC Login] Effective APP_URL for OIDC state cookies: ${redirect_uri_base}. Setting cookies: Secure=${cookieSecure}, SameSite=${cookieSameSite}.`);
    if (process.env.NODE_ENV !== 'development' && !cookieSecure && appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
      console.warn(`[API OIDC Login - Non-Dev] WARNING: APP_URL (${appUrlFromEnv}) is HTTP. OIDC state cookies will be insecure.`);
    }

    const cookieOptions: Omit<ResponseCookie, 'name' | 'value'> = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };

    const cookieStore = cookies();
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
    const errorRedirectAppUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || '9002'}`;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
    