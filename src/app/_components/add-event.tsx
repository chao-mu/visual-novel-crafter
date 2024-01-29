"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import { SubmitButton } from "@/app/_components/submit-button";

type AddEventProps = {
  timelineId: number;
  storyId: number;
  order: number;
};

type SayForm = {
  text: string;
  characterId: number;
  eventType: "say";
};

export function AddEvent({ timelineId, storyId, order }: AddEventProps) {
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<SayForm>();
  const characters = api.character.getCharactersByStoryId.useQuery({
    storyId,
  });

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
      <select id="eventType" {...register("eventType")}>
        <option value="say">Say</option>
      </select>
      <select id="characterId" {...register("characterId")}>
        {characters.data?.map((character) => (
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
