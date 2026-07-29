import { callClaudeJson } from "./anthropic";
import { PLATFORM_META } from "./platforms";
import type { Brand, Platform, Topic } from "./types";

const POST_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description:
        "Le texte du post, prêt à copier-coller. Aucun markdown de titre, aucun commentaire méta, aucune mention de la plateforme. Les hashtags ne sont PAS dans ce champ.",
    },
    hashtags: {
      type: "array",
      description:
        "Hashtags adaptés à la plateforme, avec le # inclus, en minuscules sauf noms propres.",
      items: { type: "string" },
    },
    media_suggestion: {
      type: "string",
      description:
        "Description concrète de l'image ou de la vidéo à créer pour accompagner le post (cadrage, sujet, ambiance). Note de production interne, pas du contenu à publier.",
    },
  },
  required: ["content", "hashtags", "media_suggestion"],
  additionalProperties: false,
} as const;

export type GeneratedPost = {
  content: string;
  hashtags: string[];
  media_suggestion: string;
};

/** Prompt système : identité + ligne éditoriale de la marque (contexte permanent). */
export function buildSystemPrompt(brand: Brand): string {
  const sections = [
    `Tu es le rédacteur social media de la marque « ${brand.name} ». Tu écris en français, à la première personne de la marque.`,
    brand.brand_profile?.trim()
      ? `## Fiche de la marque\n\n${brand.brand_profile.trim()}`
      : `## Fiche de la marque\n\nAucune fiche n'a encore été renseignée pour cette marque. Reste factuel et n'invente aucune information sur l'entreprise.`,
    brand.editorial_guidelines?.trim()
      ? `## Consignes éditoriales\n\n${brand.editorial_guidelines.trim()}`
      : null,
    `## Règles absolues

- N'invente jamais de chiffre, de date, de prix, de témoignage, de récompense ou de référence client. Si une donnée n'est pas fournie dans le brief ou la fiche, ne l'écris pas.
- Interdiction du vocabulaire creux : « acteur incontournable », « solutions innovantes », « à l'ère du digital », « plongez au cœur de », « dans un monde où ».
- Pas de titre markdown, pas de gras, pas de liste à puces sauf si la plateforme s'y prête vraiment.
- N'écris jamais de méta-commentaire (« Voici votre post », « J'espère que… »). Tu produis uniquement le contenu publiable.
- Respecte scrupuleusement les interdits de la marque listés dans les consignes éditoriales.
- Le champ \`content\` ne contient pas les hashtags : ils vont dans \`hashtags\`.`,
  ];

  return sections.filter(Boolean).join("\n\n");
}

/** Prompt utilisateur : brief du sujet + format de la plateforme cible. */
export function buildUserPrompt(
  topic: Pick<Topic, "title" | "angle" | "details" | "objective">,
  platform: Platform,
): string {
  const meta = PLATFORM_META[platform];

  const brief = [
    `**Sujet** : ${topic.title}`,
    topic.angle?.trim() ? `**Angle / info clé à faire passer** : ${topic.angle.trim()}` : null,
    topic.details?.trim()
      ? `**Détails à intégrer (chiffres, offre, date, lieu…)** : ${topic.details.trim()}`
      : null,
    topic.objective?.trim() ? `**Objectif du post** : ${topic.objective.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `## Brief du sujet

${brief}

## Plateforme cible : ${meta.label}

${meta.brief}

Rédige maintenant le post ${meta.label} correspondant à ce brief, dans le ton de la marque.`;
}

/** Génère un post pour une plateforme donnée. */
export async function generatePostForPlatform(
  brand: Brand,
  topic: Pick<Topic, "title" | "angle" | "details" | "objective">,
  platform: Platform,
  extraInstruction?: string,
): Promise<GeneratedPost> {
  const prompt = extraInstruction?.trim()
    ? `${buildUserPrompt(topic, platform)}\n\n## Consigne supplémentaire pour cette regénération\n\n${extraInstruction.trim()}`
    : buildUserPrompt(topic, platform);

  const result = await callClaudeJson<GeneratedPost>({
    system: buildSystemPrompt(brand),
    prompt,
    schema: POST_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
    effort: "medium",
  });

  return {
    content: result.content.trim(),
    hashtags: normalizeHashtags(result.hashtags),
    media_suggestion: result.media_suggestion.trim(),
  };
}

export function normalizeHashtags(tags: string[] | null | undefined): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const cleaned = raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (!cleaned) continue;
    const tag = `#${cleaned}`;
    const dedupeKey = tag.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(tag);
  }
  return out;
}

/**
 * Génère un post par plateforme sélectionnée, en parallèle.
 * Une plateforme en échec n'empêche pas les autres d'aboutir.
 */
export async function generatePostsForTopic(
  brand: Brand,
  topic: Pick<Topic, "title" | "angle" | "details" | "objective">,
  platforms: Platform[],
): Promise<{
  posts: Array<{ platform: Platform; post: GeneratedPost }>;
  failures: Array<{ platform: Platform; message: string }>;
}> {
  const settled = await Promise.allSettled(
    platforms.map((platform) =>
      generatePostForPlatform(brand, topic, platform).then((post) => ({
        platform,
        post,
      })),
    ),
  );

  const posts: Array<{ platform: Platform; post: GeneratedPost }> = [];
  const failures: Array<{ platform: Platform; message: string }> = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      posts.push(result.value);
    } else {
      failures.push({
        platform: platforms[index],
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Erreur inconnue",
      });
    }
  });

  return { posts, failures };
}
