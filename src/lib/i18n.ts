export type Locale = "en" | "fr";

export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE: Locale = "en";

const en = {
  brand: "Docs → Answers",
  nav: { ask: "Ask", sources: "Sources", history: "History", evals: "Evals" },
  language: { label: "Language", switchTo: "Switch language" },
  footer: {
    disclaimer:
      "Answers are grounded in your documents. Verify citations before acting on them.",
  },
  ask: {
    title: "Ask your documents",
    description:
      "Answers come only from the ingested sources, with citations. Off-topic questions get an honest abstention.",
    questionLabel: "Question",
    questionPlaceholder: "What is the refund policy?",
    submit: "Ask",
    submitting: "Searching…",
    emptyCorpus: "No documents yet. Add sources or load the sample handbook to get started.",
    sampleButton: "Load sample handbook",
    needsKey:
      "Set OPENAI_API_KEY to ask questions. Browsing sources works without a key.",
  },
  sources: {
    title: "Sources",
    description: "Documents the assistant is allowed to cite.",
    empty: "No documents yet.",
    uploadLabel: "Upload (.md, .txt, .pdf)",
    urlLabel: "Or import from URL",
    urlPlaceholder: "https://…",
    import: "Import",
    delete: "Delete",
  },
  history: {
    title: "History",
    empty: "No questions asked yet.",
  },
  evals: {
    title: "Evals",
    description:
      "Fixed question set measuring grounded answers and honest abstentions.",
    run: "Run evals",
    running: "Running…",
    needsKey: "Set OPENAI_API_KEY to run evals.",
  },
  common: { none: "None." },
};

export type Dictionary = typeof en;

const fr: Dictionary = {
  brand: "Docs → Answers",
  nav: { ask: "Poser", sources: "Sources", history: "Historique", evals: "Évals" },
  language: { label: "Langue", switchTo: "Changer de langue" },
  footer: {
    disclaimer:
      "Les réponses proviennent de vos documents. Vérifiez les citations avant d'agir.",
  },
  ask: {
    title: "Interrogez vos documents",
    description:
      "Les réponses proviennent uniquement des sources ingérées, avec citations. Les questions hors sujet reçoivent une abstention honnête.",
    questionLabel: "Question",
    questionPlaceholder: "Quelle est la politique de remboursement ?",
    submit: "Poser",
    submitting: "Recherche…",
    emptyCorpus: "Aucun document. Ajoutez des sources ou chargez le guide d'exemple pour commencer.",
    sampleButton: "Charger le guide d'exemple",
    needsKey:
      "Définissez OPENAI_API_KEY pour poser des questions. La navigation fonctionne sans clé.",
  },
  sources: {
    title: "Sources",
    description: "Documents que l'assistant est autorisé à citer.",
    empty: "Aucun document.",
    uploadLabel: "Importer (.md, .txt, .pdf)",
    urlLabel: "Ou importer depuis une URL",
    urlPlaceholder: "https://…",
    import: "Importer",
    delete: "Supprimer",
  },
  history: {
    title: "Historique",
    empty: "Aucune question posée.",
  },
  evals: {
    title: "Évals",
    description:
      "Jeu de questions fixe mesurant les réponses fondées et les abstentions honnêtes.",
    run: "Lancer les évals",
    running: "En cours…",
    needsKey: "Définissez OPENAI_API_KEY pour lancer les évals.",
  },
  common: { none: "Aucun." },
};

export const dictionaries: Record<Locale, Dictionary> = { en, fr };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "fr" ? "fr" : "en";
}
