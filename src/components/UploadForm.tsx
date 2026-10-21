"use client";

import { useActionState } from "react";
import {
  importUrlAction,
  uploadDocumentAction,
  type FormState,
} from "@/lib/actions";
import { useI18n } from "./LocaleProvider";
import { btnPrimary, btnSecondary, inputLargeClass, labelClass } from "./ui";

const IDLE: FormState = { error: null, notice: null };

export function UploadForm() {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    uploadDocumentAction,
    IDLE,
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
          accept=".md,.markdown,.txt,.pdf,text/plain"
          className={`${inputLargeClass} cursor-pointer py-1.5 text-muted file:mr-3 file:h-full file:cursor-pointer file:rounded file:border-0 file:bg-surface file:px-2.5 file:text-xs file:font-medium file:text-foreground`}
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

export function UrlImportForm() {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    importUrlAction,
    IDLE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="url">
          {d.sources.urlLabel}
        </label>
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          className={inputLargeClass}
          placeholder={d.sources.urlPlaceholder}
          required
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.notice && <p className="text-sm text-muted">{state.notice}</p>}

      <button type="submit" className={btnSecondary} disabled={pending}>
        {pending ? d.sources.urlSubmitting : d.sources.urlSubmit}
      </button>
    </form>
  );
}
