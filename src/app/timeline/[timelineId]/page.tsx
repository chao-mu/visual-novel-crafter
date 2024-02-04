// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import { AddEvent } from "@/app/_components/add-event";
import styles from "./page.module.css";

type TimelinePageProps = {
  params: {
    timelineId: string;
  };
};

type RenderedEvent = {
  order: number;
  element: JSX.Element;
};

const SayEvent = (say: {
  id: number;
  text: string;
  character: { name: string };
}) => (
  <li key={`say-${say.id}`}>
    {say.character.name}: {say.text}
  </li>
);

const MenuEvent = (menu: {
  id: number;
  menuItems: { id: number; text: string }[];
}) => (
  <li key={`menu-${menu.id}`}>
    Menu:
    <ul>
      {menu.menuItems.map((item) => (
        <li key={`menu-item-${item.id}`}>{item.text}</li>
      ))}
    </ul>
  </li>
);

export default async function TimelinePage({
  params: { timelineId },
}: TimelinePageProps) {
  const timeline = await api.timeline.getTimelineById.query({
    id: Number(timelineId),
  });

  if (!timeline) {
    return notFound();
  }

  const events: RenderedEvent[] = [
    ...timeline.says.map((say) => ({
      order: say.order,
      element: SayEvent(say),
    })),
    ...timeline.menus.map((menu) => ({
      order: menu.order,
      element: MenuEvent(menu),
    })),
  ];

  const sortedEvents = events
    .sort((a, b) => a.order - b.order)
    .map(({ element }) => element);

  return (
    <>
      <h1>{timeline.title}</h1>
      <ol className={styles.timeline}>{sortedEvents}</ol>
      <AddEvent
        storyId={timeline.storyId}
        timelineId={timeline.id}
        order={(events[events.length - 1]?.order ?? 0) + 1}
      />
    </>
  );
}
