"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import { SubmitButton } from "@/app/_components/submit-button";
import type { Character } from "@prisma/client";

type SayFormProps = {
  characters: Character[];
  order: number;
  timelineId: number;
};

export type SayFormValues = {
  text: string;
  characterId: number;
};

export function SayForm({ characters, timelineId, order }: SayFormProps) {
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<SayFormValues>();

  const onSuccess = () => {
    reset();
    router.refresh();
  };

  const addSay = api.timeline.addSay.useMutation({ onSuccess });

  const onSubmit = handleSubmit(({ text, characterId }, e) => {
    e?.preventDefault();
    addSay.mutate({
      text,
      order,
      characterId: Number(characterId),
      timelineId: Number(timelineId),
    });
  });

  const isLoading = addSay.isLoading;

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <select id="characterId" {...register("characterId")}>
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.name}
          </option>
        ))}
      </select>
      <input id="text" type="text" placeholder="Text" {...register("text")} />
      <SubmitButton isLoading={isLoading} />
      <p className={formStyles["submission-error"]}>{addSay.error?.message}</p>
    </form>
  );
}
