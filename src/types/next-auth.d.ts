
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string;
    idToken?: string;
    user?: User;
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    // id is already part of DefaultUser
    // Add any other custom properties for your user object here
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    // 'sub' (subject) is already part of DefaultJWT, represents user ID
  }
}
