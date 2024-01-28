"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import { SubmitButton } from "@/app/_components/submit-button";

type CreateCharacterProps = {
  storyId: number;
};

type Form = {
  name: string;
};

export function CreateCharacter({ storyId }: CreateCharacterProps) {
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<Form>();

  const createCharacter = api.character.create.useMutation({
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });

  const onSubmit = handleSubmit(({ name }, e) => {
    e?.preventDefault();
    createCharacter.mutate({ name, storyId });
  });

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <input id="name" type="text" placeholder="Name" {...register("name")} />
      <SubmitButton isLoading={createCharacter.isLoading} />
      <p className={formStyles["submission-error"]}>
        {createCharacter.error?.message}
      </p>
    </form>
  );
}
