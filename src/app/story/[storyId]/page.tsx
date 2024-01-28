// NextJS
import { notFound } from "next/navigation";
import Link from "next/link";

// Ours
import { api } from "@/trpc/server";
import { CreateCharacter } from "@/app/_components/create-character";
import styles from "./page.module.css";

type StoryPageProps = {
  params: {
    storyId: string;
  };
};

export default async function StoryPage({
  params: { storyId },
}: StoryPageProps) {
  const story = await api.story.getStoryById.query({
    id: Number(storyId),
  });

  if (!story) {
    return notFound();
  }

  return (
    <>
      <h1>{story.title}</h1>
      <section className={styles.timelines}>
        <h2>Timelines</h2>
        <ul>
          {story.timelines.map((timeline) => (
            <li key={timeline.id}>{JSON.stringify(timeline, null, 2)}</li>
          ))}
        </ul>
      </section>
      <section className={styles.characters}>
        <h2>Characters</h2>
        <ul className={styles.characters__list}>
          {story.characters.map((character) => (
            <li key={character.id}>
              <Link href={`/character/${character.id}`}>{character.name}</Link>
            </li>
          ))}
        </ul>
        <CreateCharacter storyId={story.id} />
      </section>
    </>
  );
}
