"use client";

import { useActionState } from "react";
import { uploadDocumentAction, type FormState } from "@/lib/actions";
import { useI18n } from "./LocaleProvider";
import { btnPrimary, inputLargeClass, labelClass } from "./ui";

export function UploadForm() {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    uploadDocumentAction,
    { error: null, notice: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="file">
          {d.sources.uploadLabel}
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".md,.markdown,.txt,text/plain"
          className={`${inputLargeClass} pt-2`}
          required
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-muted">{state.notice}</p>}

      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? d.sources.submitting : d.sources.submit}
      </button>
    </form>
  );
}
