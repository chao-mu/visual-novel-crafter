"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";
import styles from "./create-character.module.css";

type CreateCharacterProps = {
  storyId: number;
};

export function CreateCharacter({ storyId }: CreateCharacterProps) {
  const router = useRouter();
  const [name, setName] = useState("");

  const createCharacter = api.character.create.useMutation({
    onSuccess: () => {
      router.refresh();
      setName("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createCharacter.mutate({ name, storyId });
      }}
      className={styles.form}
    >
      <input
        id="name"
        name="name"
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={styles.input}
      />
      <button
        type="submit"
        className={styles.submitButton}
        disabled={createCharacter.isLoading}
      >
        {createCharacter.isLoading ? "Submitting..." : "Submit"}
      </button>
      <label htmlFor="name" className={styles.error}>
        {createCharacter.error?.message}
      </label>
    </form>
  );
}
