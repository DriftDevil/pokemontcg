'use server';
import { NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const client = await getOidcClient();
    const idToken = cookies().get('id_token')?.value;

    // Clear local session cookies
    cookies().delete('id_token');
    cookies().delete('access_token');
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    
    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const logoutRedirectUrl = process.env.LOGOUT_REDIRECT_URL || appUrl;

    if (client.issuer.metadata.end_session_endpoint && idToken) {
      const endSessionUrl = client.endSessionUrl({
        id_token_hint: idToken,
        post_logout_redirect_uri: logoutRedirectUrl,
      });
      return NextResponse.redirect(endSessionUrl);
    }
    
    // Fallback if end_session_endpoint is not available or no idToken
    return NextResponse.redirect(logoutRedirectUrl);

  } catch (error) {
    console.error('Logout route error:', error);
    // Clear cookies even on error
    cookies().delete('id_token');
    cookies().delete('access_token');
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    const appUrl = process.env.APP_URL || 'http://localhost:9002';
    const logoutRedirectUrl = process.env.LOGOUT_REDIRECT_URL || appUrl;
    return NextResponse.redirect(logoutRedirectUrl);
  }
}
