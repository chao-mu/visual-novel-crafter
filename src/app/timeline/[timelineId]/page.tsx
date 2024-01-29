// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import type { Say } from "@prisma/client";
import { AddEvent } from "@/app/_components/add-event";

type TimelinePageProps = {
  params: {
    timelineId: string;
  };
};

type RenderedEvent = {
  id: number;
  order: number;
  element: JSX.Element;
};

export default async function TimelinePage({
  params: { timelineId },
}: TimelinePageProps) {
  const timeline = await api.timeline.getTimelineById.query({
    id: Number(timelineId),
  });

  if (!timeline) {
    return notFound();
  }

  const renderSay = (say: Say) => (
    <div key={`say-${say.id}`}>
      {say.character.name}: {say.text}
    </div>
  );

  const events: RenderedEvent[] = timeline.says.map((say) => ({
    id: say.id,
    order: say.order,
    element: renderSay(say),
  }));

  return (
    <>
      <h1>{timeline.title}</h1>
      <ol>
        {events
          .sort((a, b) => a.order - b.order)
          .map(({ id, element }) => (
            <li key={id}>{element}</li>
          ))}
      </ol>
      <AddEvent
        storyId={timeline.storyId}
        timelineId={timeline.id}
        order={(events[events.length - 1]?.order ?? 0) + 1}
      />
    </>
  );
}
