// NextJs
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import styles from "./index.module.css";
import { getServerAuthSession } from "@/server/auth";
import { CreateStory } from "./_components/create-story";

export default async function Home() {
  noStore();
  const session = await getServerAuthSession();
  const stories = await api.story.getVisible.query();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Visual Novel Crafter</h1>
      <p>Welcome {session?.user?.name}</p>
      <section className={styles.stories}>
        <h2>Stories</h2>
        <ul className={styles.stories__list}>
          {stories.map((story) => (
            <li key={story.id}>
              <a href={`/story/${story.id}`}>{story.title}</a>
            </li>
          ))}
        </ul>
        <CreateStory />
      </section>
    </main>
  );
}
