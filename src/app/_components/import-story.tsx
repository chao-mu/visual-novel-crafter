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
  debug: boolean;
};

function Debug(obj) {
  return <pre className={utilStyles.code}>{JSON.stringify(obj, null, 2)}</pre>;
}

function ScriptResult({
  script,
  debug,
}: {
  script: ParsedScript | null;
  debug?: boolean;
}) {
  if (script === null) {
    return <></>;
  }

  if (script.errors.length > 0) {
    return <ScriptErrors errors={script.errors} />;
  }

  return debug ? (
    <Debug script={script} />
  ) : (
    <ScriptMeta metadata={script.metadata} />
  );
}

function ScriptErrors({ errors }: { errors: ParsedScript["errors"] }) {
  return <Debug errors={errors} />;
}

function ScriptMeta({ metadata }: { metadata: ParsedScript["metadata"] }) {
  return <Debug metadata={metadata} />;
}

export function ImportStory() {
  const { register, handleSubmit, getValues } = useForm<Form>({
    defaultValues: { debug: true },
  });

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

  const debug = getValues("debug");
  console.log(debug);

  return (
    <form onSubmit={onSubmit} className={formStyles["inline-form"]}>
      <input
        id="url"
        type="text"
        placeholder="Google Docs URL"
        {...register("url")}
      />
      <label htmlFor="debug">Debug</label>
      <input id="debug" type="checkbox" {...register("debug")} />
      <SubmitButton isLoading={loadScript.isLoading} />
      <p className={formStyles["submission-error"]}>
        {loadScript.error?.message}
      </p>
      <ScriptResult script={parsedScript} debug={debug} />
    </form>
  );
}
