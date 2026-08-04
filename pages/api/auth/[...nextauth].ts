import NextAuth, { Account } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import type { Session, NextAuthOptions } from 'next-auth';
import { logger } from '../../../utils/logging';
import { env } from '../../../lib/env';

// Extend the Session type to include our custom properties
interface ExtendedSession extends Session {
  accessToken?: string;
  error?: string;
}

async function refreshAccessToken(token: JWT) {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_ID,
        client_secret: env.GOOGLE_SECRET,
        refresh_token: token.refreshToken as string,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const refreshedTokens = await response.json();

    if (!refreshedTokens.access_token) {
      throw new Error('No access token in response');
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    // Don't log the actual error as it might contain sensitive data
    logger.error('Token refresh error occurred');
    
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

// Exported so API routes can validate the caller's session via getServerSession
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
      authorization: {
        params: {
          scope: env.GOOGLE_SCOPE,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  debug: env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      try {
        // Initial sign in
        if (account) {
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          };
        }

        // Return previous token if the access token has not expired yet
        if (Date.now() < (token.accessTokenExpires as number)) {
          return token;
        }

        // Access token has expired, try to update it
        return refreshAccessToken(token);
      } catch (error) {
        logger.error('JWT callback error');
        return {
          ...token,
          error: 'TokenError',
        };
      }
    },
    async session({ session, token }: { session: ExtendedSession; token: JWT }) {
      try {
        if (token) {
          session.accessToken = token.accessToken as string;
          session.error = token.error as string | undefined;
        }
        return session;
      } catch (error) {
        logger.error('Session callback error');
        return {
          ...session,
          error: 'SessionError',
        };
      }
    },
  },
};

export default NextAuth(authOptions);
