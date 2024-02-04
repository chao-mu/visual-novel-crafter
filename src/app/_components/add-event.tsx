"use client";

// React
import { useState, ReactNode } from "react";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import styles from "./add-event.module.css";
import { SayForm } from "@/app/_components/say-form";
import { MenuForm } from "@/app/_components/menu-form";

type AddEventProps = {
  timelineId: number;
  storyId: number;
  order: number;
};

export function AddEvent({ timelineId, storyId, order }: AddEventProps) {
  const characters = api.character.getCharactersByStoryId.useQuery({
    storyId,
  });
  const [eventType, setEventType] = useState("say");

  const formLookup: Record<string, () => ReactNode> = {
    say: () => (
      <SayForm
        characters={characters.data ?? []}
        timelineId={timelineId}
        order={order}
      />
    ),
    menu: () => <MenuForm timelineId={timelineId} order={order} />,
  };

  const form = formLookup[eventType] ?? (() => null);

  return (
    <section className={styles["add-event"]}>
      <select
        value={eventType}
        id="eventType"
        onChange={(e) => setEventType(e.target.value)}
      >
        <option value="say">Say</option>
        <option value="menu">Menu</option>
      </select>
      {form()}
    </section>
  );
}
