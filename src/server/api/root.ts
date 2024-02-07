import { storyRouter } from "@/server/api/routers/story";
import { characterRouter } from "@/server/api/routers/character";
import { timelineRouter } from "@/server/api/routers/timeline";
import { scriptRouter } from "@/server/api/routers/script";

import { createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  story: storyRouter,
  character: characterRouter,
  timeline: timelineRouter,
  script: scriptRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
