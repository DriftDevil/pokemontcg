
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
    // For OIDC state cookies, 'SameSite=Lax' is generally fine if the callback is to the same site.
    // 'None' might be needed if IdP interaction is strictly cross-site and causes issues,
    // but 'Lax' is a safer starting point.
    let cookieSameSite: 'lax' | 'none' | 'strict' | undefined = 'lax'; 

    if (isDevelopment) {
      if (appUrlFromEnv && appUrlFromEnv.startsWith('https://')) {
        cookieSecure = true;
        // If OIDC flow strictly requires cross-site cookies for state due to IdP on different domain
        // and browser restrictions, 'SameSite=None; Secure=true' might be necessary.
        // However, for many same-site callback scenarios, Lax is fine and preferred.
        // For now, sticking to Lax as a safer default unless 'None' is proven necessary.
        // Example: if (OIDC_REQUIRES_SAMESITE_NONE) cookieSameSite = 'none';
        console.log(`[API OIDC Login] Development (HTTPS APP_URL): Setting OIDC state cookies with SameSite=${cookieSameSite}; Secure=true.`);
      } else { // HTTP dev or APP_URL not set
        cookieSecure = false;
        // cookieSameSite remains 'lax'
        console.log(`[API OIDC Login] Development (HTTP APP_URL or APP_URL not set): Setting OIDC state cookies with SameSite=Lax; Secure=false.`);
      }
    } else { // Production
        if (appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
            // This is a misconfiguration for production if HTTPS is intended via proxy
            cookieSecure = false;
            console.warn(
                `[API OIDC Login] WARNING: APP_URL (${appUrlFromEnv}) is HTTP in a production environment. ` +
                "OIDC state cookies will be insecure. This is NOT recommended."
            );
        } else { // Default to Secure for production (APP_URL is HTTPS or not set, assuming proxy handles HTTPS)
            cookieSecure = true;
            // cookieSameSite remains 'lax' unless specific cross-site IdP flow dictates 'None'
            // Example: if (OIDC_REQUIRES_SAMESITE_NONE_PROD) cookieSameSite = 'none';
            if (!appUrlFromEnv || !appUrlFromEnv.startsWith('https://')) {
                console.warn(
                    `[API OIDC Login] WARNING: APP_URL is not explicitly HTTPS or not set in production. `+
                    `Assuming HTTPS for OIDC state cookies (SameSite=${cookieSameSite}). Ensure APP_URL is set to your full public HTTPS URL in .env.`
                );
            }
        }
    }
    // Enforce Secure if SameSite=None is used (though current default is Lax)
    if (cookieSameSite === 'none' && !cookieSecure) {
        console.warn("[API OIDC Login] Correcting: SameSite=None requires Secure=true. OIDC state cookies will be Secure.");
        cookieSecure = true; 
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
    