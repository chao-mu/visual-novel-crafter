// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";

type TimelinePageProps = {
  params: {
    timelineId: string;
  };
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

  return (
    <>
      <h1>{timeline.title}</h1>
    </>
  );
}
