
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
    const redirect_uri = `${appUrlFromEnv || 'http://localhost:9002'}/api/auth/callback`;

    const isDevelopment = process.env.NODE_ENV === 'development';
    let cookieSecure: boolean;
    const cookieSameSite: 'lax' | 'none' | 'strict' | undefined = 'lax'; 

    if (isDevelopment) {
      if (appUrlFromEnv && appUrlFromEnv.startsWith('https://')) {
        cookieSecure = true;
        console.log(`[API OIDC Login] Development (HTTPS APP_URL): Setting OIDC state cookies with SameSite=${cookieSameSite}; Secure=true.`);
      } else { 
        cookieSecure = false;
        console.log(`[API OIDC Login] Development (HTTP APP_URL or APP_URL not set): Setting OIDC state cookies with SameSite=${cookieSameSite}; Secure=false.`);
      }
    } else { // Production or other environments
        if (appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
            cookieSecure = false;
            console.warn(
                `[API OIDC Login] WARNING: APP_URL (${appUrlFromEnv}) is HTTP in a non-development environment. ` +
                "OIDC state cookies will be insecure. This is NOT recommended."
            );
        } else { 
            cookieSecure = true; // Default to Secure=true in non-dev
             if (!appUrlFromEnv || !appUrlFromEnv.startsWith('https://')) {
                console.log( // Info, not warn
                    `[API OIDC Login] Non-development: APP_URL is not explicitly HTTPS or not set. `+
                    `Setting OIDC state cookies with SameSite=${cookieSameSite}; Secure=true. Ensure APP_URL matches public HTTPS URL.`
                );
            } else {
                console.log(`[API OIDC Login] Non-development (HTTPS APP_URL): Setting OIDC state cookies with SameSite=${cookieSameSite}; Secure=true.`);
            }
        }
    }
    
    // SameSite=None requires Secure=true. Since we default to Lax, this check is mostly for future proofing if SameSite changes.
    if (cookieSameSite === 'none' && !cookieSecure) {
        console.warn("[API OIDC Login] Correcting: SameSite=None requires Secure=true. OIDC state cookies will be Secure=true.");
        cookieSecure = true; 
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
    const errorRedirectAppUrl = process.env.APP_URL || 'http://localhost:9002';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, errorRedirectAppUrl));
  }
}
    
