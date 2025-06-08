
'use server';
import { NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';

export async function GET() {
  const appUrl = process.env.APP_URL || 'http://localhost:9002';
  const logoutRedirectUrl = process.env.LOGOUT_REDIRECT_URL || appUrl; // Where to go after all logout ops

  try {
    const idToken = cookies().get('id_token')?.value;
    const passwordAccessToken = cookies().get('password_access_token')?.value;

    // Clear local session cookies
    cookies().delete('id_token');
    cookies().delete('access_token'); // OIDC access token
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    cookies().delete('password_access_token'); // Password login token

    // If it was an OIDC session, try to perform OIDC logout
    if (idToken) {
      try {
        const client = await getOidcClient(); // Ensure OIDC client is available
        if (client.issuer.metadata.end_session_endpoint) {
          const endSessionUrl = client.endSessionUrl({
            id_token_hint: idToken,
            post_logout_redirect_uri: logoutRedirectUrl, // User is redirected here after Authentik logout
          });
          return NextResponse.redirect(endSessionUrl);
        }
      } catch (oidcError) {
        console.error('OIDC client error during logout, proceeding with local logout:', oidcError);
        // Fall through to redirect if OIDC part fails
      }
    }
    
    // Fallback or if it was a password session: just redirect to the app's designated logout page or home
    return NextResponse.redirect(logoutRedirectUrl);

  } catch (error) {
    console.error('General logout route error:', error);
    // Ensure cookies are cleared even on general error
    cookies().delete('id_token');
    cookies().delete('access_token');
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    cookies().delete('password_access_token');
    return NextResponse.redirect(logoutRedirectUrl); // Redirect to a safe page
  }
}
