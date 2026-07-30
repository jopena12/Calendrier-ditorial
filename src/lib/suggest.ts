import { MODELS, callClaudeJson } from "./anthropic";
import { PLATFORMS } from "./platforms";
import type { Brand, Platform } from "./types";

const SUGGESTIONS_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      description: "Les sujets proposés, du plus prioritaire au moins urgent.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Le sujet en une phrase claire.",
          },
          angle: {
            type: "string",
            description: "L'angle précis / l'info clé à faire passer.",
          },
          details: {
            type: "string",
            description:
              "Uniquement des éléments présents dans la fiche de marque (offre, module, promesse). Vide si la fiche ne fournit rien de précis. N'invente aucun chiffre.",
          },
          objective: {
            type: "string",
            enum: ["informer", "vendre", "engager", "recruter", "inspirer"],
          },
          platforms: {
            type: "array",
            description:
              "Réseaux où ce sujet fonctionne le mieux, parmi linkedin, instagram, facebook, tiktok.",
            items: {
              type: "string",
              enum: ["linkedin", "instagram", "facebook", "tiktok"],
            },
          },
          needs_input: {
            type: "string",
            description:
              "Ce que l'utilisateur doit fournir avant publication si le sujet réclame une donnée que la fiche ne contient pas (chiffre, date, prix, témoignage). Chaîne vide si le sujet se suffit à lui-même.",
          },
        },
        required: [
          "title",
          "angle",
          "details",
          "objective",
          "platforms",
          "needs_input",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["topics"],
  additionalProperties: false,
} as const;

const SYSTEM = `Tu es responsable éditorial social media. Tu construis des plans de contenu à partir d'une fiche de marque.

Règles :
- Tu écris en français.
- Tu ne proposes que des sujets ancrés dans la fiche de marque : offres réelles, modules réels, promesses réelles, vocabulaire réel. Aucun sujet hors-sol.
- Tu n'inventes ni chiffre, ni date, ni prix, ni témoignage, ni référence client. Si un sujet a besoin d'une donnée que la fiche ne contient pas, tu remplis \`needs_input\` pour la réclamer au lieu de l'inventer.
- Tu varies les angles : pédagogie, coulisses, démonstration d'une fonctionnalité ou d'une prestation, objection client levée, saisonnalité, comparatif honnête, réassurance. Deux sujets ne doivent jamais reposer sur le même ressort.
- Tu évites scrupuleusement tout sujet déjà traité (liste fournie). Ni le même sujet, ni une reformulation du même angle.
- Tu choisis les réseaux en fonction du sujet, pas par défaut : un sujet technique n'a rien à faire sur TikTok, un sujet visuel n'a pas besoin de LinkedIn.`;

export type TopicSuggestion = {
  title: string;
  angle: string;
  details: string;
  objective: string;
  platforms: Platform[];
  needs_input: string;
};

export type CoveredTopic = {
  title: string;
  angle: string | null;
  created_at: string;
};

function formatCovered(covered: CoveredTopic[]): string {
  if (covered.length === 0) {
    return "Aucun sujet n'a encore été traité pour cette marque.";
  }
  return covered
    .map((topic) => {
      const date = topic.created_at.slice(0, 10);
      return topic.angle
        ? `- (${date}) ${topic.title} — angle : ${topic.angle}`
        : `- (${date}) ${topic.title}`;
    })
    .join("\n");
}

/**
 * Propose des sujets pour une marque, en excluant ce qui a déjà été traité.
 * Un seul appel Claude pour tout le lot.
 */
export async function suggestTopics(
  brand: Brand,
  covered: CoveredTopic[],
  count: number,
): Promise<TopicSuggestion[]> {
  if (!brand.brand_profile?.trim()) {
    throw new Error(
      "Cette marque n'a pas de fiche de connaissance : lance d'abord son onboarding, sinon les sujets proposés seront génériques.",
    );
  }

  const prompt = [
    `Marque : ${brand.name}`,
    `## Fiche de la marque\n\n${brand.brand_profile.trim()}`,
    brand.editorial_guidelines?.trim()
      ? `## Consignes éditoriales\n\n${brand.editorial_guidelines.trim()}`
      : null,
    `## Sujets déjà traités (à ne pas répéter, ni reformuler)\n\n${formatCovered(covered)}`,
    `## Ta tâche

Propose ${count} nouveaux sujets de publication pour cette marque.

Pour chacun : le sujet en une phrase, l'angle, les détails tirés de la fiche, l'objectif, et les réseaux où il fonctionne le mieux.
Si un sujet a besoin d'une information que la fiche ne contient pas, remplis \`needs_input\` au lieu d'inventer.
Classe-les du plus utile au moins urgent.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callClaudeJson<{ topics: TopicSuggestion[] }>({
    model: MODELS.suggestions,
    system: SYSTEM,
    prompt,
    schema: SUGGESTIONS_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 12000,
    effort: "high",
  });

  return result.topics.map((topic) => ({
    ...topic,
    title: topic.title.trim(),
    angle: topic.angle.trim(),
    details: topic.details.trim(),
    needs_input: topic.needs_input.trim(),
    platforms: topic.platforms.filter((platform): platform is Platform =>
      (PLATFORMS as string[]).includes(platform),
    ),
  }));
}
