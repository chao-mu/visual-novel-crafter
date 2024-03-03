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
import type { ParsedScript } from "@/script";

type Form = {
  url: string;
};

export function ImportStory() {
  const { register, handleSubmit } = useForm<Form>();
  const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);

  const loadScript = api.script.loadScript.useMutation({
    onSuccess: (data) => {
      const script = parseScript(data);
      setParsedScript(script);
      if (script.errors.length > 0) {
        return;
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
    element.download = "script.rpy";
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
      {parsedScript &&
        (parsedScript.errors.length > 0 ? (
          <pre className={utilStyles.code}>
            {JSON.stringify(parsedScript.errors, null, 2)}
          </pre>
        ) : (
          <ul>
            {[...parsedScript.metadata.attributesByTag.entries()].map(
              ([tag, attributes]) => (
                <li key={tag}>
                  {tag} - {[...attributes].join(", ")}
                </li>
              ),
            )}
          </ul>
        ))}
    </form>
  );
}
