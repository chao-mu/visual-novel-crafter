"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import { SubmitButton } from "@/app/_components/submit-button";

type Form = {
  title: string;
};

export function CreateStory() {
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<Form>();

  const createStory = api.story.create.useMutation({
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });

  const onSubmit = handleSubmit(({ title }, e) => {
    e?.preventDefault();
    createStory.mutate({ title });
  });

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <input
        id="title"
        type="text"
        placeholder="Title"
        {...register("title")}
      />
      <SubmitButton isLoading={createStory.isLoading} />
      <p className={formStyles["submission-error"]}>
        {createStory.error?.message}
      </p>
    </form>
  );
}
