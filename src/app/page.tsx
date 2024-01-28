// NextJs
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

// Ours
import { api } from "@/trpc/server";
import styles from "./page.module.css";
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
      <section className={styles.stories}>
        <h2>Stories</h2>
        <ul className={styles.stories__list}>
          {stories.map((story) => (
            <li key={story.id}>
              <Link href={`/story/${story.id}`}>{story.title}</Link>
            </li>
          ))}
        </ul>
        <CreateStory />
      </section>
    </main>
  );
}
