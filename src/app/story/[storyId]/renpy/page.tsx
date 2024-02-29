// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import type { Say } from "@prisma/client";

type RenpyPageProps = {
  params: {
    storyId: string;
  };
};

export default async function RenpyPage({
  params: { storyId },
}: RenpyPageProps) {
  const story = await api.story.getStoryById.query({ id: Number(storyId) });

  if (!story) {
    return notFound();
  }

  const indent = "  ";

  const characterVars = Object.fromEntries(
    story.characters.map((character) => [
      character.id,
      `character${character.id}`,
    ])
  );

  const renderSay = (say: Say) => {
    const characterVar = characterVars[say.characterId];
    return `${characterVar} "${say.text}"`;
  };

  const events: Record<number, string[]> = Object.fromEntries(
    story.timelines.map((timeline) => [
      timeline.id,
      timeline.says
        .map((say) => ({
          order: say.order,
          code: renderSay(say),
        }))
        .sort((a, b) => a.order - b.order)
        .map(({ code }) => code),
    ])
  );

  const timelineLabels = Object.fromEntries(
    story.timelines.map((timeline) => [timeline.id, `timeline${timeline.id}`])
  );

  const renderedSections = [
    story.characters.map((character) => {
      return `define ${characterVars[character.id]} = Character("${
        character.name
      }")`;
    }),

    ["label start:", `${indent}jump ${timelineLabels[story.timelines[0].id]}`],

    story.timelines.flatMap((timeline) => [
      `label ${timelineLabels[timeline.id]}:`,
      events[timeline.id]?.map((event) => `${indent}${event}`).join("\n") ?? [],
    ]),
  ];

  console.log(renderedSections);

  return (
    <textarea
      rows={50}
      readOnly
      value={renderedSections.map((section) => section.join("\n")).join("\n\n")}
    />
  );
}
