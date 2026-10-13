"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./LocaleProvider";
import { EmptyState, btnPrimary, btnSecondary } from "./ui";

interface ItemEvent {
  type: "item";
  index: number;
  total: number;
  id: string;
  question: string;
  passed: boolean;
  detail: string;
  answer: string;
}

type StreamEvent =
  | ItemEvent
  | { type: "done"; runId: string; score: number; total: number }
  | { type: "error"; message: string };

export function EvalsRunner({ hasKey, hasSample }: { hasKey: boolean; hasSample: boolean }) {
  const { d } = useI18n();
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<ItemEvent[]>([]);
  const [score, setScore] = useState<{ runId: string; score: number; total: number } | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);

  async function run() {
    if (running) return;
    setRunning(true);
    setItems([]);
    setScore(null);
    setErrorKind(null);

    try {
      const response = await fetch("/api/evals/run", { method: "POST" });
      if (!response.ok || !response.body) {
        throw new Error(`Request failed (${response.status}).`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          const rawLine = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!rawLine) continue;
          const event = JSON.parse(rawLine) as StreamEvent;
          if (event.type === "item") {
            setItems((current) => [...current, event]);
          } else if (event.type === "done") {
            setScore({ runId: event.runId, score: event.score, total: event.total });
          } else if (event.type === "error") {
            setErrorKind(event.message);
          }
        }
      }
    } catch {
      setErrorKind("failed");
    } finally {
      setRunning(false);
    }
  }

  if (!hasKey) return <EmptyState>{d.evals.needsKey}</EmptyState>;
  if (!hasSample) return <EmptyState>{d.evals.needsSample}</EmptyState>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" className={btnPrimary} disabled={running} onClick={() => void run()}>
          {running ? d.evals.running : d.evals.run}
        </button>
        {running && items.length > 0 && (
          <span className="text-sm text-muted">
            {items.length} / {items[0].total}
          </span>
        )}
      </div>

      {errorKind && (
        <div className="rounded-md border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger">
          {errorKind === "no-sample" ? d.evals.needsSample : d.evals.runFailed}
        </div>
      )}

      {score && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-4">
          <p className="text-sm font-medium">
            {score.score} / {score.total}
          </p>
          <Link
            href={`/evals/${score.runId}`}
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {d.evals.viewRun}
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.question}</p>
                <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium ${item.passed ? "text-accent" : "text-danger"}`}
              >
                {item.passed ? d.evals.passed : d.evals.failed}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(items.length > 0 || score) && !running && (
        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={() => void run()}>
            {d.evals.runAgain}
          </button>
        </div>
      )}
    </div>
  );
}
