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
    description: "Answers come from the documents below, with citations.",
    questionLabel: "Question",
    questionPlaceholder: "What is the refund policy?",
    searchingIn: "Searching {names}",
    manageSources: "Sources →",
    emptyCorpus:
      "No documents yet. Add some in Sources, or try the sample handbook.",
    sampleButton: "Load sample handbook",
    sampleLoading: "Loading sample…",
    sampleNote: "Sample: a short fake handbook to try things out.",
    sampleFailed: "Couldn't load the sample (the embedding provider is busy). Try again.",
    submit: "Ask",
    submitting: "Searching…",
    searching: "Searching…",
    answering: "Answering…",
    considered: "{n} excerpts",
    citedLabel: "Sources",
    abstained: "Not covered by these documents.",
    askFailed: "Answering failed. Try again.",
    emptyQuestion: "Type a question first.",
    retry: "Retry",
    savedLink: "Saved to history →",
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
    chunks: "{n} chunks",
    chunksOne: "1 chunk",
  },
  history: {
    title: "History",
    empty: "No questions asked yet.",
    back: "← History",
    delete: "Delete",
    abstainedBadge: "not in docs",
    citationsCount: "{n} citations",
    citationsCountOne: "1 citation",
    notFound: "Entry not found",
    notFoundHint: "Demo history is ephemeral — instances don't share it. Ask a new question to see a full entry.",
  },
  evals: {
    title: "Evals",
    description:
      "15 fixed questions on the sample handbook. Pass means the right keywords plus the right source, or a clean abstention.",
    expects: "expects",
    abstains: "should abstain",
    run: "Run evals",
    running: "Running…",
    runAgain: "Run again",
    passed: "pass",
    failed: "fail",
    viewRun: "View full run →",
    runFailed: "Eval run failed. Try again.",
    needsSample: "Load the sample handbook first - the eval set is graded against it.",
    needsKey: "Set OPENAI_API_KEY to run evals.",
    pastRuns: "Past runs",
    noRuns: "No runs yet.",
    back: "← Evals",
    notFound: "Run not found",
    notFoundHint: "Demo history is ephemeral — instances don't share it. Run the evals to see a full report.",
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
    description: "Les réponses viennent des documents ci-dessous, avec citations.",
    questionLabel: "Question",
    questionPlaceholder: "Quelle est la politique de remboursement ?",
    searchingIn: "Recherche dans {names}",
    manageSources: "Sources →",
    emptyCorpus:
      "Aucun document. Ajoutez-en dans Sources, ou essayez le guide d'exemple.",
    sampleButton: "Charger le guide d'exemple",
    sampleLoading: "Chargement de l'exemple…",
    sampleNote: "Exemple : un petit guide fictif pour essayer.",
    sampleFailed: "Impossible de charger l'exemple (le fournisseur d'embeddings est saturé). Réessayez.",
    submit: "Poser",
    submitting: "Recherche…",
    searching: "Recherche…",
    answering: "Réponse en cours…",
    considered: "{n} extraits",
    citedLabel: "Sources",
    abstained: "Non couvert par ces documents.",
    askFailed: "Échec de la réponse. Réessayez.",
    emptyQuestion: "Tapez d'abord une question.",
    retry: "Réessayer",
    savedLink: "Enregistré dans l'historique →",
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
    chunks: "{n} fragments",
    chunksOne: "1 fragment",
  },
  history: {
    title: "Historique",
    empty: "Aucune question posée.",
    back: "← Historique",
    delete: "Supprimer",
    abstainedBadge: "hors docs",
    citationsCount: "{n} citations",
    citationsCountOne: "1 citation",
    notFound: "Entrée introuvable",
    notFoundHint: "L'historique de démo est éphémère — les instances ne le partagent pas. Posez une nouvelle question pour voir une entrée complète.",
  },
  evals: {
    title: "Évals",
    description:
      "15 questions fixes sur le guide d'exemple. Réussi = bons mots-clés + bonne source, ou abstention propre.",
    expects: "attend",
    abstains: "doit s'abstenir",
    run: "Lancer les évals",
    running: "En cours…",
    runAgain: "Relancer",
    passed: "réussi",
    failed: "échoué",
    viewRun: "Voir le run complet →",
    runFailed: "Échec du run. Réessayez.",
    needsSample: "Chargez d'abord le guide d'exemple - le jeu d'éval est noté dessus.",
    needsKey: "Définissez OPENAI_API_KEY pour lancer les évals.",
    pastRuns: "Runs précédents",
    noRuns: "Aucun run.",
    back: "← Évals",
    notFound: "Run introuvable",
    notFoundHint: "L'historique de démo est éphémère — les instances ne le partagent pas. Lancez les évals pour voir un rapport complet.",
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
