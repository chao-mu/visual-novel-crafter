// NextAuth
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Google API
import { google } from "googleapis";

// Ours
import { env } from "@/env";
import { db } from "@/server/db";

export async function refreshGoogleAccessToken({
  refreshToken,
}: {
  refreshToken: string;
}): Promise<{ accessToken?: string; error?: string }> {
  const oauth = new google.auth.OAuth2({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  });

  oauth.setCredentials({
    refresh_token: refreshToken,
  });

  return await oauth
    .getAccessToken()
    .then(({ token }) =>
      token ? { accessToken: token } : { error: "No access token returned" },
    )
    .catch((error) => ({ error: String(error) }));
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessTokenExpires?: Date;
    error: string;
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: async ({ session, user }) => {
      session = {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };

      return session;
    },
  },
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/documents.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
        },
      },
      profile: async (profile, tokens) => {
        profile = {
          ...profile,
          id: profile.sub,
        };

        if (!tokens.expires_at || !tokens.refresh_token) {
          return profile;
        }

        await db.account.updateMany({
          data: {
            access_token: tokens.access_token,
            expires_at: tokens.expires_at / 1000,
            refresh_token: tokens.refresh_token,
          },
          where: {
            providerAccountId: profile.sub,
            provider: "google",
          },
        });

        return profile;
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
