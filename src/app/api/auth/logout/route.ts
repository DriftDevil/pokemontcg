
'use server';
import { NextResponse } from 'next/server';
import { getOidcClient } from '@/lib/oidcClient';
import { cookies } from 'next/headers';

export async function GET() {
  const appUrl = process.env.APP_URL || 'http://localhost:9002';
  const logoutRedirectUrl = process.env.LOGOUT_REDIRECT_URL || appUrl; 

  try {
    const cookieStore = cookies();
    const idToken = cookieStore.get('id_token')?.value;

    // Clear local session cookies
    cookieStore.delete('id_token');
    cookieStore.delete('session_token'); 
    cookieStore.delete('oidc_code_verifier'); // Should have been cleared on callback, but good to be sure
    cookieStore.delete('oidc_nonce');       // Same as above

    // If it was an OIDC session (indicated by presence of id_token), try to perform OIDC logout
    if (idToken) {
      try {
        const client = await getOidcClient(); 
        if (client.issuer.metadata.end_session_endpoint) {
          const endSessionUrl = client.endSessionUrl({
            id_token_hint: idToken,
            post_logout_redirect_uri: logoutRedirectUrl, 
          });
          return NextResponse.redirect(endSessionUrl);
        }
      } catch (oidcError) {
        console.error('OIDC client error during logout, proceeding with local logout and redirect:', oidcError);
      }
    }
    
    // Fallback or if it was a local (password) session: just redirect
    return NextResponse.redirect(logoutRedirectUrl);

  } catch (error) {
    console.error('General logout route error:', error);
    // Ensure cookies are cleared even on general error
    cookies().delete('id_token');
    cookies().delete('session_token');
    cookies().delete('oidc_code_verifier');
    cookies().delete('oidc_nonce');
    return NextResponse.redirect(logoutRedirectUrl); 
  }
}
