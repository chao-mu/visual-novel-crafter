// NextJS
import { notFound } from "next/navigation";

// Ours
import { api } from "@/trpc/server";

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
    <>
      <h1>{character.name}</h1>
    </>
  );
}
