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
    searching: "Searching the corpus…",
    answering: "Answering…",
    considered: "{n} excerpts considered",
    citedLabel: "Sources cited",
    abstained: "Not covered by these documents.",
    askFailed: "Answering failed. Try again.",
    emptyQuestion: "Type a question first.",
    retry: "Retry",
    savedLink: "Saved to history →",
    emptyCorpus: "No documents yet. Add sources or load the sample handbook to get started.",
    corpusReady: "{chunks} chunks indexed across {docs} documents.",
    sampleButton: "Load sample handbook",
    sampleRefresh: "Reload the sample handbook.",
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
    urlSubmit: "Import URL",
    urlSubmitting: "Importing…",
    import: "Import",
    submit: "Ingest document",
    submitting: "Ingesting…",
    imported: "Imported",
    emptyFile: "Please choose a non-empty file.",
    unsupported: "Only .md, .txt and .pdf files.",
    invalidUrl: "Please enter a valid http(s) URL.",
    fetchFailed: "Could not fetch that URL. Check it and try again.",
    tooBig: "File is too large (500k characters max).",
    failed: "Ingest failed. Try again.",
    delete: "Delete",
  },
  history: {
    title: "History",
    empty: "No questions asked yet.",
    back: "← History",
    abstainedBadge: "not in docs",
    citationsCount: "{n} citations",
  },
  evals: {
    title: "Evals",
    description:
      "Fixed question set measuring grounded answers and honest abstentions.",
    run: "Run evals",
    running: "Running…",
    runAgain: "Run again",
    passed: "pass",
    failed: "fail",
    viewRun: "View full run →",
    runFailed: "Eval run failed. Try again.",
    needsSample: "Load the sample handbook first — the eval set is graded against it.",
    needsKey: "Set OPENAI_API_KEY to run evals.",
    pastRuns: "Past runs",
    noRuns: "No runs yet.",
    back: "← Evals",
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
    searching: "Recherche dans le corpus…",
    answering: "Réponse en cours…",
    considered: "{n} extraits examinés",
    citedLabel: "Sources citées",
    abstained: "Non couvert par ces documents.",
    askFailed: "Échec de la réponse. Réessayez.",
    emptyQuestion: "Tapez d'abord une question.",
    retry: "Réessayer",
    savedLink: "Enregistré dans l'historique →",
    emptyCorpus: "Aucun document. Ajoutez des sources ou chargez le guide d'exemple pour commencer.",
    corpusReady: "{chunks} extraits indexés dans {docs} documents.",
    sampleButton: "Charger le guide d'exemple",
    sampleRefresh: "Recharger le guide d'exemple.",
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
    urlSubmit: "Importer l'URL",
    urlSubmitting: "Importation…",
    import: "Importer",
    submit: "Ingérer le document",
    submitting: "Ingestion…",
    imported: "Importé",
    emptyFile: "Choisissez un fichier non vide.",
    unsupported: "Uniquement .md, .txt et .pdf.",
    invalidUrl: "Entrez une URL http(s) valide.",
    fetchFailed: "Impossible de récupérer cette URL. Vérifiez et réessayez.",
    tooBig: "Fichier trop volumineux (500 000 caractères max).",
    failed: "Échec de l'ingestion. Réessayez.",
    delete: "Supprimer",
  },
  history: {
    title: "Historique",
    empty: "Aucune question posée.",
    back: "← Historique",
    abstainedBadge: "hors docs",
    citationsCount: "{n} citations",
  },
  evals: {
    title: "Évals",
    description:
      "Jeu de questions fixe mesurant les réponses fondées et les abstentions honnêtes.",
    run: "Lancer les évals",
    running: "En cours…",
    runAgain: "Relancer",
    passed: "réussi",
    failed: "échoué",
    viewRun: "Voir le run complet →",
    runFailed: "Échec du run. Réessayez.",
    needsSample: "Chargez d'abord le guide d'exemple — le jeu d'éval est noté dessus.",
    needsKey: "Définissez OPENAI_API_KEY pour lancer les évals.",
    pastRuns: "Runs précédents",
    noRuns: "Aucun run.",
    back: "← Évals",
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

export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function localeTag(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(typeof value === "string" ? new Date(value) : value);
}
