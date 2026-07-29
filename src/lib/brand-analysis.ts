import { callClaudeJson } from "./anthropic";
import { formatScrapedPages, scrapeSite } from "./scrape";
import type { OnboardingAnswers } from "./types";

const BRAND_PROFILE_SCHEMA = {
  type: "object",
  properties: {
    brand_profile: {
      type: "string",
      description:
        "Fiche de connaissance de la marque en markdown, avec les sections : Positionnement, Offres & prestations, Cibles (profil, besoins, freins), Ton & style, Points forts / différenciants, Éléments de langage récurrents, Preuves & références.",
    },
    editorial_guidelines: {
      type: "string",
      description:
        "Consignes éditoriales opérationnelles en markdown : ce qu'il ne faut jamais dire ou mentionner, longueur cible par réseau, usage des emojis, type de CTA, vocabulaire à privilégier / bannir.",
    },
    gaps: {
      type: "array",
      description:
        "Informations manquantes ou incertaines qu'il faudrait confirmer manuellement. Vide si tout est clair.",
      items: { type: "string" },
    },
  },
  required: ["brand_profile", "editorial_guidelines", "gaps"],
  additionalProperties: false,
} as const;

const SYSTEM = `Tu es stratège de marque et directeur de la communication. Tu construis des fiches de connaissance de marque destinées à alimenter la génération de contenu social media.

Règles :
- Tu écris en français.
- Tu t'appuies UNIQUEMENT sur les éléments fournis (contenu du site, réponses au questionnaire). Tu n'inventes ni chiffre, ni référence client, ni certification.
- Quand une information manque, tu ne la remplaces pas par du générique : tu la signales dans "gaps".
- Tu es concret et spécifique. Une fiche utile contient du vocabulaire réel de la marque, pas des banalités ("acteur incontournable", "solutions innovantes" sont interdits).
- Tu cites les éléments de langage réellement présents sur le site (formules, promesses, slogans).`;

export type BrandAnalysisResult = {
  brand_profile: string;
  editorial_guidelines: string;
  gaps: string[];
  scrapedUrls: string[];
  warnings: string[];
};

function formatAnswers(answers: OnboardingAnswers | null): string {
  if (!answers) return "";
  const rows: Array<[string, string | undefined]> = [
    ["Activité, produits et services précis", answers.activity],
    ["Clients cibles (profil, besoins, freins)", answers.targets],
    ["Ton de communication souhaité", answers.tone],
    ["Ce qu'il ne faut jamais dire / mentionner", answers.forbidden],
    ["Exemples de posts qui ont bien marché", answers.examples],
  ];
  const filled = rows.filter(([, value]) => value && value.trim().length > 0);
  if (filled.length === 0) return "";
  return filled
    .map(([label, value]) => `**${label}**\n${value!.trim()}`)
    .join("\n\n");
}

/**
 * Onboarding marque : scraping du site + questionnaire → fiche de connaissance.
 * Les deux sources sont optionnelles, mais au moins une est nécessaire.
 */
export async function analyzeBrand(input: {
  name: string;
  websiteUrl?: string | null;
  answers?: OnboardingAnswers | null;
  existingProfile?: string | null;
}): Promise<BrandAnalysisResult> {
  const warnings: string[] = [];
  let siteSection = "";
  let scrapedUrls: string[] = [];

  if (input.websiteUrl && input.websiteUrl.trim()) {
    const { pages, errors } = await scrapeSite(input.websiteUrl);
    warnings.push(...errors);
    scrapedUrls = pages.map((page) => page.url);
    if (pages.length > 0) {
      siteSection = `## Contenu extrait du site\n\n${formatScrapedPages(pages)}`;
    }
  }

  const answersText = formatAnswers(input.answers ?? null);
  const answersSection = answersText
    ? `## Réponses au questionnaire\n\n${answersText}`
    : "";

  if (!siteSection && !answersSection) {
    throw new Error(
      "Rien à analyser : renseigne une URL de site ou réponds au questionnaire.",
    );
  }

  const existingSection = input.existingProfile?.trim()
    ? `## Fiche existante (à mettre à jour, pas à ignorer)\n\n${input.existingProfile.trim()}`
    : "";

  const prompt = [
    `Marque : ${input.name}`,
    input.websiteUrl ? `Site : ${input.websiteUrl}` : null,
    existingSection || null,
    siteSection || null,
    answersSection || null,
    `## Ta tâche

Extrais de ces éléments :
- le positionnement,
- les offres et prestations précises,
- le ton employé,
- les points forts / différenciants,
- les cibles (profil, besoins, freins),
- les éléments de langage récurrents.

Produis ensuite la fiche \`brand_profile\` et les consignes \`editorial_guidelines\`.
Cette fiche servira de contexte permanent pour rédiger tous les futurs posts de la marque : elle doit être assez précise pour empêcher tout contenu générique.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callClaudeJson<{
    brand_profile: string;
    editorial_guidelines: string;
    gaps: string[];
  }>({
    system: SYSTEM,
    prompt,
    schema: BRAND_PROFILE_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 12000,
    effort: "high",
  });

  return { ...result, scrapedUrls, warnings };
}
