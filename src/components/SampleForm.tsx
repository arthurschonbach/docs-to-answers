"use client";

import { useActionState } from "react";
import { loadSampleAction, type FormState } from "@/lib/actions";
import { useI18n } from "./LocaleProvider";
import { PendingButton } from "./PendingButton";
import { btnSecondary } from "./ui";

const IDLE: FormState = { error: null, notice: null };

export function SampleForm() {
  const { d } = useI18n();
  const [state, formAction] = useActionState<FormState>(loadSampleAction, IDLE);

  return (
    <form action={formAction} className="space-y-2">
      <PendingButton className={btnSecondary} pendingLabel={d.ask.sampleLoading}>
        {d.ask.sampleButton}
      </PendingButton>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
