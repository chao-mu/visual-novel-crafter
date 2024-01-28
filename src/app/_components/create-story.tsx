"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";
import styles from "./create-story.module.css";

export function CreateStory() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  const createStory = api.story.create.useMutation({
    onSuccess: () => {
      router.refresh();
      setTitle("");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createStory.mutate({ title });
      }}
      className={styles.form}
    >
      <input
        id="title"
        name="title"
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={styles.input}
      />
      <button
        type="submit"
        className={styles.submitButton}
        disabled={createStory.isLoading}
      >
        {createStory.isLoading ? "Submitting..." : "Submit"}
      </button>
      <label htmlFor="title" className={styles.error}>
        {createStory.error?.message}
      </label>
    </form>
  );
}
