import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const storyRouter = createTRPCRouter({
  getRenderedStory: protectedProcedure
  .input(z.object({ storyId: z.number() }))
  .query(({ ctx, { storyId } }) => {
    const story = ctx.prisma.story.findUnique({
      where: {
        id: storyId,
      },
    });

    const characters = ctx.prisma.character.findMany({
      where: {
        storyId,
      },
    });

    return {
      story,
    };
  }),
});
