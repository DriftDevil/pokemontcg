
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

    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const redirect_uri = `${appUrl}/api/auth/callback`;

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
    
    const currentAppUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || '9002'}`;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const appUrlIsHttps = currentAppUrl.startsWith('https://');

    let cookieSecure: boolean;
    let cookieSameSite: 'lax' | 'none' | 'strict' | undefined;

    if (isDevelopment) {
        cookieSecure = true; // Must be true for SameSite=None
        cookieSameSite = 'none';
        if (!appUrlIsHttps) {
            console.warn(
                `[API OIDC Callback] WARNING: Cookies (id_token, session_token) configured with SameSite=None and Secure=true for development, but APP_URL (${currentAppUrl}) is not HTTPS. ` +
                "These cookies may be rejected by the browser. Ensure your development setup uses HTTPS."
            );
        }
    } else { // Production or other environments
        if (appUrlIsHttps) {
            cookieSecure = true;
            cookieSameSite = 'lax';
        } else {
            cookieSecure = false;
            cookieSameSite = 'lax'; // Default to Lax for non-secure production, though not ideal.
            console.warn(
                `[API OIDC Callback] WARNING: APP_URL (${currentAppUrl}) is not HTTPS in a non-development environment. ` +
                "Cookies (id_token, session_token) will be sent with Secure=false and SameSite=lax."
            );
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

    console.log(`[API OIDC Callback] Setting 'id_token' cookie with options: ${JSON.stringify(idTokenCookie)} (isDevelopment: ${isDevelopment}, appUrlIsHttps: ${appUrlIsHttps})`);
    cookieStore.set(idTokenCookie);
    console.log(`[API OIDC Callback] Setting 'session_token' cookie with options: ${JSON.stringify(sessionTokenCookie)} (isDevelopment: ${isDevelopment}, appUrlIsHttps: ${appUrlIsHttps})`);
    cookieStore.set(sessionTokenCookie);
    
    cookieStore.delete('oidc_code_verifier');
    cookieStore.delete('oidc_nonce');
    cookieStore.delete('oidc_state');

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
