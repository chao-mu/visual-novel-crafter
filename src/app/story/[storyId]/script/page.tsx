"use client";

// React
import type { ChangeEvent } from "react";

// NextJS
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";

type PageProps = {
  params: {
    storyId: string;
  };
};

export default function Page({ params: { storyId } }: PageProps) {
  const router = useRouter();
  const onSuccess = () => {
    router.refresh();
  };

  const loadScript = api.script.loadScript.useMutation({ onSuccess });

  /*
  const showFile = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const file = files.item(0)!;

    const reader = new FileReader();
    reader.onload = () => {
      const script = reader.result as string;
      loadScript.mutate({ script });
    };

    reader.readAsText(file);
  };
  */

  return (
    <>
      <h1>Upload a file</h1>
      <button onClick={() => loadScript.mutate({ storyId })}>
      {/*
      <input type="file" onChange={showFile} />
      <div>
        <p>{loadScript.error?.message}</p>
        <pre>{JSON.stringify(loadScript.data, null, 2)}</pre>
      </div>
      */}
    </>
  );
}
