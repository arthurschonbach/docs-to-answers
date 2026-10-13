"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "./LocaleProvider";
import type { CitedChunk } from "@/lib/db";
import {
  EmptyState,
  areaClass,
  btnPrimary,
  btnSecondary,
  labelClass,
} from "./ui";

interface MetaChunk {
  n: number;
  docName: string;
  excerpt: string;
  score: number;
}

type StreamEvent =
  | { type: "meta"; chunks: MetaChunk[] }
  | { type: "token"; text: string }
  | { type: "done"; answer: string; citations: CitedChunk[]; qaId: string }
  | { type: "abstain"; qaId: string }
  | { type: "error"; message: string };

type Phase = "idle" | "searching" | "answering" | "done" | "abstained" | "error";

export function AskForm({ hasKey }: { hasKey: boolean }) {
  const { d } = useI18n();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<CitedChunk[]>([]);
  const [considered, setConsidered] = useState(0);
  const [qaId, setQaId] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);

  const busy = phase === "searching" || phase === "answering";

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setPhase("searching");
    setAnswer("");
    setCitations([]);
    setConsidered(0);
    setQaId(null);
    setErrorKind(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Request failed (${response.status}).`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let terminal: Phase | null = null;

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
          if (event.type === "meta") {
            setConsidered(event.chunks.length);
            setPhase("answering");
          } else if (event.type === "token") {
            full += event.text;
            setAnswer(full);
          } else if (event.type === "done") {
            full = event.answer;
            setAnswer(event.answer);
            setCitations(event.citations);
            setQaId(event.qaId);
            setPhase("done");
            terminal = "done";
          } else if (event.type === "abstain") {
            setQaId(event.qaId);
            setPhase("abstained");
            terminal = "abstained";
          } else if (event.type === "error") {
            setErrorKind(event.message);
            setPhase("error");
            terminal = "error";
          }
        }
      }
      if (!terminal) {
        // Stream cut off mid-answer: show what arrived, without citations.
        if (full.trim()) setPhase("done");
        else {
          setErrorKind("failed");
          setPhase("error");
        }
      }
    } catch {
      setErrorKind("failed");
      setPhase("error");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass} htmlFor="question">
          {d.ask.questionLabel}
        </label>
        <textarea
          id="question"
          rows={3}
          className={areaClass}
          placeholder={d.ask.questionPlaceholder}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              void ask();
            }
          }}
          disabled={busy || !hasKey}
        />
      </div>

      {!hasKey && <EmptyState>{d.ask.needsKey}</EmptyState>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy || !hasKey || !question.trim()}
          onClick={() => void ask()}
        >
          {busy ? d.ask.answering : d.ask.submit}
        </button>
        {phase === "searching" && (
          <span className="text-sm text-muted">{d.ask.searching}</span>
        )}
        {phase === "answering" && considered > 0 && (
          <span className="text-sm text-muted">
            {d.ask.considered.replace("{n}", String(considered))}
          </span>
        )}
      </div>

      {(phase === "answering" || phase === "done") && answer && (
        <div className="space-y-4">
          <div className="rounded-md border border-border p-4 sm:p-5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          </div>
          {phase === "done" && citations.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                {d.ask.citedLabel}
              </h2>
              <ul className="space-y-2">
                {citations.map((c) => (
                  <li
                    key={c.chunkId}
                    className="rounded-md border border-border p-3 text-sm"
                  >
                    <p className="text-xs font-medium text-muted">
                      [{c.n}] · {c.docName}
                    </p>
                    <p className="mt-1 text-muted">{c.excerpt}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {phase === "done" && qaId && (
            <p className="text-sm">
              <Link
                href={`/history/${qaId}`}
                className="text-muted underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {d.ask.savedLink}
              </Link>
            </p>
          )}
        </div>
      )}

      {phase === "abstained" && <EmptyState>{d.ask.abstained}</EmptyState>}

      {phase === "error" && (
        <div className="flex flex-col gap-3 rounded-md border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
          <p>{errorMessage(d.ask, errorKind)}</p>
          <button className={btnSecondary} onClick={() => void ask()}>
            {d.ask.retry}
          </button>
        </div>
      )}
    </div>
  );
}

function errorMessage(
  ask: { askFailed: string; emptyQuestion: string; needsKey: string },
  kind: string | null,
): string {
  if (kind === "empty") return ask.emptyQuestion;
  if (kind === "no-key") return ask.needsKey;
  return ask.askFailed;
}
