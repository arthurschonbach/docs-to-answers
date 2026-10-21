"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/* Submit button for server-action forms: disabled with a label while the
   action runs, so slow work (embedding the sample) doesn't look stuck. */
export function PendingButton({
  className,
  pendingLabel,
  children,
}: {
  className?: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
