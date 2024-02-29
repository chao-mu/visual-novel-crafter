"use client";

// react-hook-form
import { useForm } from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const { register, reset, handleSubmit } = useForm<Form>();

  const loadScript = api.script.loadScript.useMutation({
    onSuccess: () => {
      reset();
      router.refresh();
    },
  });

  const onSubmit = handleSubmit(({ url }, e) => {
    e?.preventDefault();
    loadScript.mutate({ url });
  });

  const script = loadScript.data ? parseScript(loadScript.data) : null;

  let output = "...";
  if (script) {
    const { errors } = script;
    if (errors.length > 0) {
      output = JSON.stringify(errors, null, 2);
    } else {
      output = scriptToCode(script);
    }
  }

  const downloadUrl = window.URL.createObjectURL(
    new Blob([output], { type: "text/plain" }),
  );

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
      <a href={downloadUrl} download="script.rpy">
        Download
      </a>
      <pre className={utilStyles.code}>{output}</pre>
    </form>
  );
}
