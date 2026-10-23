import type { Rule } from "./rate-limit";

// Budgets for the public demo. Per-IP limits stop one visitor from hogging
// the shared free-tier quota; global caps bound the worst case per day.

export const ASK_LIMITS: Rule[] = [
  { name: "ask", limit: 30, windowSec: 600, scope: "ip" },
  { name: "ask", limit: 1000, windowSec: 86_400, scope: "global" },
];

export const INGEST_LIMITS: Rule[] = [
  { name: "ingest", limit: 20, windowSec: 3600, scope: "ip" },
  { name: "ingest", limit: 300, windowSec: 86_400, scope: "global" },
];

// One eval run is 15 answers plus 15 embeddings.
export const EVAL_LIMITS: Rule[] = [
  { name: "evals", limit: 3, windowSec: 3600, scope: "ip" },
  { name: "evals", limit: 20, windowSec: 86_400, scope: "global" },
];
