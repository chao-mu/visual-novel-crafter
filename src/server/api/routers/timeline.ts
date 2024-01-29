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
        include: { says: { include: { character: true } } },
      });
    }),

  getVisible: protectedProcedure.query(({ ctx }) => {
    return ctx.db.timeline.findMany({});
  }),

  addSay: protectedProcedure
    .input(
      z.object({
        timelineId: z.number(),
        characterId: z.number(),
        order: z.number(),
        text: z.string().min(1),
      })
    )
    .mutation(
      async ({ ctx, input: { timelineId, characterId, text, order } }) => {
        const createdBy = { connect: { id: ctx.session.user.id } };
        return ctx.db.say.create({
          data: {
            createdBy,
            order,
            text,
            timeline: { connect: { id: timelineId } },
            character: { connect: { id: characterId } },
          },
        });
      }
    ),
});
