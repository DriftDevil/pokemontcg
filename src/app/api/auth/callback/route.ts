
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function GET(request: NextRequest) {
  try {
    const client = await getOidcClient();
    const searchParams = request.nextUrl.searchParams;
    
    const code_verifier = cookies().get('oidc_code_verifier')?.value;
    const nonce = cookies().get('oidc_nonce')?.value;

    if (!code_verifier) {
      throw new Error('Missing code_verifier cookie');
    }
    if (!nonce) {
        throw new Error('Missing nonce cookie');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:9003';
    const redirect_uri = `${appUrl}/api/auth/callback`;

    const params = client.callbackParams(request.url);

    const tokenSet = await client.callback(redirect_uri, params, { 
      code_verifier,
      nonce,
    });

    if (!tokenSet.id_token) {
        throw new Error('ID token not found in token set');
    }
    if (!tokenSet.access_token) {
        throw new Error('Access token not found in token set');
    }
    
    const isProduction = process.env.NODE_ENV === 'production';
    const baseCookieOptions: Partial<ResponseCookie> = {
      httpOnly: true,
      path: '/',
      maxAge: tokenSet.expires_in || 3600, // Use token expiry or default to 1 hour
      secure: isProduction,
    };

    if (isProduction) {
        baseCookieOptions.sameSite = 'lax'; // Or 'strict'
        if (process.env.APP_URL) {
            try {
                const url = new URL(process.env.APP_URL);
                baseCookieOptions.domain = url.hostname;
            } catch (e) {
                console.error('[API OIDC Callback] Failed to parse APP_URL for production cookie domain:', e);
            }
        }
    } else {
        // Development settings for localhost
        // Explicitly omitting sameSite for localhost, secure is false by default via isProduction
    }
    
    const idTokenCookieOptions = { ...baseCookieOptions };
    const sessionTokenCookieOptions = { ...baseCookieOptions };

    cookies().set('id_token', tokenSet.id_token, idTokenCookieOptions);
    cookies().set('session_token', tokenSet.access_token, sessionTokenCookieOptions);
    
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');

    return NextResponse.redirect(new URL('/admin/dashboard', appUrl));
  } catch (error) {
    console.error('OIDC Callback route error:', error);
    let errorMessage = 'OIDC callback failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    cookies().delete('id_token');
    cookies().delete('session_token');
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, process.env.APP_URL || 'http://localhost:9003'));
  }
}
