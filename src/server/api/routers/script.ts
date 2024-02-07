import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

function loadScript() {
  return {};
}

export const scriptRouter = createTRPCRouter({
  loadScript: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(({ input: {} }) => loadScript()),
});
