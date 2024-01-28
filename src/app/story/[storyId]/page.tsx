// NextJS - get url param for server component
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import styles from "./index.module.css";

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
    <main className={styles.main}>
      <h1>{story.title}</h1>
    </main>
  );
}
