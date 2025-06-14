
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

    if (!code_verifier) {
      throw new Error('Missing code_verifier cookie');
    }
    if (!nonce) {
        throw new Error('Missing nonce cookie');
    }
    if (!state) {
        throw new Error('Missing state cookie');
    }

    const appUrlFromEnv = process.env.APP_URL; // Keep original for redirect
    const redirect_uri = `${appUrlFromEnv || 'http://localhost:9002'}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, { 
      code_verifier,
      nonce,
      state, 
    });

    if (!tokenSet.id_token) {
        throw new Error('ID token not found in token set');
    }
    if (!tokenSet.access_token) {
        throw new Error('Access token not found in token set');
    }
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    let cookieSecure: boolean;
    let cookieSameSite: 'lax' | 'none' | 'strict' | undefined = 'lax'; // Default to lax

    if (isDevelopment) {
      // For development, if APP_URL is explicitly HTTPS, we can use Secure. Otherwise, non-Secure.
      // SameSite=Lax is a good default for dev too.
      if (appUrlFromEnv && appUrlFromEnv.startsWith('https://')) {
        cookieSecure = true;
        console.log(`[API OIDC Callback] Development (HTTPS APP_URL): Setting cookies with SameSite=Lax; Secure=true.`);
      } else {
        cookieSecure = false;
        console.log(`[API OIDC Callback] Development (HTTP APP_URL or APP_URL not set): Setting cookies with SameSite=Lax; Secure=false.`);
      }
    } else { // Production or other environments
      // In production, strongly prefer Secure cookies. Assume HTTPS unless APP_URL is explicitly HTTP.
      if (appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
        cookieSecure = false;
        console.warn(
            `[API OIDC Callback] WARNING: APP_URL (${appUrlFromEnv}) is HTTP in a production environment. ` +
            "Session cookies (id_token, session_token) will be insecure. This is NOT recommended."
        );
      } else {
        cookieSecure = true;
        if (!appUrlFromEnv || !appUrlFromEnv.startsWith('https://')) {
             console.warn(
                `[API OIDC Callback] WARNING: APP_URL is not explicitly HTTPS or not set in production. `+
                "Assuming HTTPS for cookies. Ensure APP_URL is set to your full public HTTPS URL in .env."
            );
        }
      }
    }
    
    const baseCookieOpts: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, 
      secure: cookieSecure,
      sameSite: cookieSameSite,
    };
    
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

    console.log(`[API OIDC Callback] Setting 'id_token' cookie with options: ${JSON.stringify(idTokenCookie)}`);
    cookieStore.set(idTokenCookie);
    console.log(`[API OIDC Callback] Setting 'session_token' cookie with options: ${JSON.stringify(sessionTokenCookie)}`);
    cookieStore.set(sessionTokenCookie);
    
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');

    const finalRedirectUrl = appUrlFromEnv || 'http://localhost:9002';
    return NextResponse.redirect(new URL('/admin/dashboard', finalRedirectUrl));
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
    