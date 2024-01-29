import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const characterRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ storyId: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const createdBy = { connect: { id: ctx.session.user.id } };
      return ctx.db.character.create({
        data: {
          createdBy,
          name: input.name,
          story: {
            connect: { id: input.storyId },
          },
        },
      });
    }),

  getCharacterById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.character.findUnique({
        where: { id: input.id, createdById: ctx.session.user.id },
      });
    }),

  getCharactersByStoryId: protectedProcedure
    .input(z.object({ storyId: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.character.findMany({
        where: { storyId: input.storyId, createdById: ctx.session.user.id },
      });
    }),

  getVisible: protectedProcedure.query(({ ctx }) => {
    return ctx.db.character.findMany({});
  }),
});
