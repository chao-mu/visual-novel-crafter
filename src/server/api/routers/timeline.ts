import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const timelineRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), storyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const createdBy = { connect: { id: ctx.session.user.id } };
      return ctx.db.timeline.create({
        data: {
          createdBy,
          title: input.title,
          story: { connect: { id: input.storyId } },
        },
      });
    }),

  getTimelineById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.timeline.findUnique({
        where: { id: input.id, createdById: ctx.session.user.id },
      });
    }),

  getVisible: protectedProcedure.query(({ ctx }) => {
    return ctx.db.timeline.findMany({});
  }),
});
