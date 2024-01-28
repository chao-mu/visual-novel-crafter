// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";
import styles from "./page.module.css";

type CharacterPageProps = {
  params: {
    characterId: string;
  };
};

export default async function CharacterPage({
  params: { characterId },
}: CharacterPageProps) {
  const character = await api.character.getCharacterById.query({
    id: Number(characterId),
  });

  if (!character) {
    return notFound();
  }

  return (
    <main className={styles.main}>
      <h1>{character.name}</h1>
    </main>
  );
}
