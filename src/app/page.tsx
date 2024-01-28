import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/server/auth";
import styles from "./index.module.css";

export default async function Home() {
  noStore();
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Visual Novel Crafter</h1>
      <p>Welcome {session?.user?.name}</p>
    </main>
  );
}
