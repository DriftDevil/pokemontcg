
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

    const appUrlFromEnv = process.env.APP_URL; 
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
    const cookieSameSite: 'lax' | 'none' | 'strict' | undefined = 'lax';

    if (isDevelopment) {
      if (appUrlFromEnv && appUrlFromEnv.startsWith('https://')) {
        cookieSecure = true;
        console.log(`[API OIDC Callback] Development (HTTPS APP_URL): Setting cookies with SameSite=${cookieSameSite}; Secure=true.`);
      } else {
        cookieSecure = false;
        console.log(`[API OIDC Callback] Development (HTTP APP_URL or APP_URL not set): Setting cookies with SameSite=${cookieSameSite}; Secure=false.`);
      }
    } else { // Production or other environments
      if (appUrlFromEnv && appUrlFromEnv.startsWith('http://')) {
        cookieSecure = false;
        console.warn(
            `[API OIDC Callback] WARNING: APP_URL (${appUrlFromEnv}) is HTTP in a non-development environment. ` +
            "Session cookies (id_token, session_token) will be insecure. This is NOT recommended."
        );
      } else {
        cookieSecure = true; // Default to Secure=true in non-dev
        if (!appUrlFromEnv || !appUrlFromEnv.startsWith('https://')) {
             console.log( // Info rather than warn if APP_URL is unset, as we default to secure
                `[API OIDC Callback] Non-development: APP_URL is not explicitly HTTPS or not set. `+
                `Setting cookies with SameSite=${cookieSameSite}; Secure=true. Ensure APP_URL matches public HTTPS URL.`
            );
        } else {
            console.log(`[API OIDC Callback] Non-development (HTTPS APP_URL): Setting cookies with SameSite=${cookieSameSite}; Secure=true.`);
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

    cookieStore.set(idTokenCookie);
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
    
