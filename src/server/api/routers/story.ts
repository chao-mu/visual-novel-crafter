import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const storyRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.story.create({
        data: {
          title: input.title,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getStoryById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.story.findUnique({
        where: { id: input.id, createdById: ctx.session.user.id },
        include: { createdBy: true },
      });
    }),
  getVisible: protectedProcedure.query(({ ctx }) => {
    return ctx.db.story.findMany({});
  }),
});
