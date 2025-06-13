
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

    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const redirect_uri = `${appUrl}/api/auth/callback`;

    const isDevelopment = process.env.NODE_ENV === 'development';
    const appUrlIsHttps = appUrl.startsWith('https://');

    let cookieSecure: boolean;
    let cookieSameSite: 'lax' | 'none' | 'strict' | undefined;

    if (isDevelopment) {
      if (appUrlIsHttps) {
        // HTTPS Development: SameSite=None and Secure=true is viable for OIDC state cookies
        cookieSecure = true;
        cookieSameSite = 'none';
        console.log(`[API OIDC Login] Development (HTTPS): Setting OIDC state cookies with SameSite=None; Secure=true.`);
      } else {
        // HTTP Development: SameSite=None requires Secure=true, which won't work. Fallback to Lax for state cookies.
        cookieSecure = false;
        cookieSameSite = 'lax';
        console.warn(
            `[API OIDC Login] WARNING: Development (HTTP - APP_URL: ${appUrl}). ` +
            "Cannot use SameSite=None for OIDC state cookies as it requires Secure=true. Falling back to SameSite=Lax; Secure=false."
        );
      }
    } else { // Production or other environments
        if (appUrlIsHttps) {
            cookieSecure = true;
            cookieSameSite = 'lax'; // Secure default for production
        } else {
            // HTTP Production (not recommended)
            cookieSecure = false;
            cookieSameSite = 'lax';
             console.warn(
                `[API OIDC Login] WARNING: APP_URL (${appUrl}) is not HTTPS in a non-development environment. ` +
                "OIDC state cookies (e.g., 'oidc_code_verifier') will be sent with Secure=false and SameSite=lax."
            );
        }
    }

    const cookieOptions: Omit<ResponseCookie, 'name' | 'value'> = {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };
    
    console.log(`[API OIDC Login] Setting OIDC state cookies with options: ${JSON.stringify(cookieOptions)}`);

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
    const errorRedirectAppUrl = process.env.APP_URL || 'http://localhost:9002';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
