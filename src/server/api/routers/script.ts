import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

import { google } from "googleapis";
import type { docs_v1 } from "googleapis";

// Ours
import { env } from "@/env";

const DOCUMENT_ID = "1E2WSu8qfNvyRbvCsXJf2M3df7NxfbI68SjMc6idIGz0";

type Document = docs_v1.Schema$Document;

export const scriptRouter = createTRPCRouter({
  loadScript: protectedProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx }): Promise<Document> => {
      const account = await ctx.db.account.findFirst({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const refreshToken = account.refresh_token;
      if (!refreshToken) {
        throw new Error("Refresh token not found");
      }

      const docs = google.docs("v1");
      const oauth = new google.auth.OAuth2({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      });

      oauth.setCredentials({
        refresh_token: refreshToken,
      });

      const res = await docs.documents
        .get({
          documentId: DOCUMENT_ID,
          auth: oauth,
        })
        .catch((err) => {
          throw new Error("Internal error: " + err);
        });

      return res.data;
    }),
});
