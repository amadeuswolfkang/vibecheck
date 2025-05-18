import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { logger } from '../../../utils/logging';

// Log environment configuration on startup
logger.debug('Auth configuration loaded', {
  hasGoogleId: !!process.env.GOOGLE_ID,
  hasGoogleSecret: !!process.env.GOOGLE_SECRET,
  hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
  hasGoogleScope: !!process.env.GOOGLE_SCOPE,
});

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
        client_id: process.env.GOOGLE_ID!,
        client_secret: process.env.GOOGLE_SECRET!,
        refresh_token: token.refreshToken as string,
        grant_type: 'refresh_token',
      }),
    });

    const refreshedTokens = await response.json();

    if (!refreshedTokens.access_token) {
      logger.error('Failed to refresh access token', new Error('No access token in response'), { refreshedTokens });
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    logger.error('Error refreshing access token', error instanceof Error ? error : new Error(String(error)));
    
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: process.env.GOOGLE_SCOPE,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account }) {
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
    },
    async session({ session, token }: { session: ExtendedSession; token: JWT }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;
      }
      return session;
    },
  },
});
