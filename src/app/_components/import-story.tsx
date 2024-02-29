"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// React
import { useState } from "react";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import utilStyles from "@/styles/util.module.css";
import { SubmitButton } from "@/app/_components/submit-button";
import { parseScript, scriptToCode } from "@/script";

type Form = {
  url: string;
};

export function ImportStory() {
  const { register, handleSubmit } = useForm<Form>();
  const [parserError, setParserError] = useState<string | null>(null);

  const loadScript = api.script.loadScript.useMutation({
    onSuccess: (data) => {
      const script = parseScript(data);
      if (script.errors.length > 0) {
        setParserError(JSON.stringify(script.errors, null, 2));
      }

      const output = scriptToCode(script);
      download(output);
    },
  });

  const onSubmit = handleSubmit(({ url }, e) => {
    e?.preventDefault();
    loadScript.mutate({ url });
  });

  const download = (content: string) => {
    const element = document.createElement("a");

    element.href = window.URL.createObjectURL(
      new Blob([content], { type: "text/plain" }),
    );
    element.download = "renpy.rpy";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    element.remove();
  };

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <input
        id="url"
        type="text"
        placeholder="Google Docs URL"
        {...register("url")}
      />
      <SubmitButton isLoading={loadScript.isLoading} />
      <p className={formStyles["submission-error"]}>
        {loadScript.error?.message}
      </p>
      <pre className={utilStyles.code}>{parserError}</pre>
    </form>
  );
}
