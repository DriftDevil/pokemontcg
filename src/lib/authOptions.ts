
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
      issuer: process.env.AUTHENTIK_ISSUER!, // e.g., https://your-authentik-domain/application/o/your-app-slug/
      authorization: { params: { scope: 'openid email profile' } },
      idToken: true,
      checks: ['pkce', 'state'],
      profile(profile: Profile & { preferred_username?: string, picture?: string }) {
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
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        if (profile) {
          token.sub = profile.sub;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
        if (token.sub && session.user) {
          session.user.id = token.sub;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: 'jwt',
  },
};
