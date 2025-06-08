
import type { NextAuthOptions, Profile } from 'next-auth';
import OIDCProvider from 'next-auth/providers/oidc';

export const authOptions: NextAuthOptions = {
  providers: [
    OIDCProvider({
      id: 'authentik',
      name: 'Authentik',
      type: 'oidc',
      clientId: process.env.AUTHENTIK_CLIENT_ID!,
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
      issuer: process.env.AUTHENTIK_ISSUER!,
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true, // Request ID token
      checks: ['pkce', 'state'], // Recommended OIDC security checks
      profile(profile: Profile & { preferred_username?: string, picture?: string }) {
        // Map profile fields from Authentik to NextAuth user object
        // 'sub' is standard for user ID in OIDC
        // 'name' might come from 'name' or 'preferred_username'
        // 'email' should be standard
        // 'picture' for image
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OIDC tokens and profile info to the JWT
      if (account) { // 'account' is available on successful sign-in
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // If your provider returns it
         if (profile) {
          // Ensure 'sub' (subject, i.e., user ID) is in the token
          // 'profile.sub' should be available from OIDC provider
          token.sub = profile.sub;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from JWT to session
      if (token) {
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string; // Expose idToken to session if needed
        if (token.sub && session.user) {
          session.user.id = token.sub; // Add user ID to session.user
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // error: '/auth/error', // Optional: define a custom error page
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: 'jwt', // Using JWT for session strategy
  },
};
