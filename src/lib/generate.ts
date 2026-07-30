import { MODELS, callClaudeJson } from "./anthropic";
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
- Le champ \`content\` ne contient pas les hashtags : ils vont dans \`hashtags\`.
- N'invente pas de hashtag de marque. Tu peux utiliser le nom de la marque exactement tel qu'il est écrit ci-dessus ; ne fabrique aucune variante ni mot-valise (pas de nom accolé à un autre mot).
- Les consignes éditoriales de la marque priment sur les consignes de format génériques de la plateforme. En cas de contradiction (longueur, nombre de hashtags, emojis, tutoiement), applique celles de la marque.`,
  ];

  return sections.filter(Boolean).join("\n\n");
}

/**
 * Contexte anti-répétition : ce qui a déjà été écrit pour cette marque.
 * `titles` = sujets déjà traités, `openings` = premières lignes des posts
 * existants sur la même plateforme (c'est là que la répétition se voit).
 */
export type AvoidContext = {
  titles: string[];
  openings: string[];
};

function formatAvoid(avoid: AvoidContext | undefined): string | null {
  if (!avoid) return null;
  const blocks: string[] = [];

  if (avoid.titles.length > 0) {
    blocks.push(
      `Sujets déjà traités pour cette marque :\n${avoid.titles
        .map((title) => `- ${title}`)
        .join("\n")}`,
    );
  }

  if (avoid.openings.length > 0) {
    blocks.push(
      `Accroches déjà utilisées sur cette plateforme (n'en réutilise ni la formulation, ni la structure) :\n${avoid.openings
        .map((opening) => `- « ${opening} »`)
        .join("\n")}`,
    );
  }

  if (blocks.length === 0) return null;

  return `## À ne pas répéter\n\n${blocks.join(
    "\n\n",
  )}\n\nLe sujet ci-dessus peut recouper un sujet déjà traité : dans ce cas, traite-le sous un angle et avec une accroche franchement différents.`;
}

/** Prompt utilisateur : brief du sujet + format de la plateforme cible. */
export function buildUserPrompt(
  topic: Pick<Topic, "title" | "angle" | "details" | "objective">,
  platform: Platform,
  avoid?: AvoidContext,
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

  return [
    `## Brief du sujet\n\n${brief}`,
    formatAvoid(avoid),
    `## Plateforme cible : ${meta.label}\n\n${meta.brief}`,
    `Rédige maintenant le post ${meta.label} correspondant à ce brief, dans le ton de la marque.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Génère un post pour une plateforme donnée. */
export async function generatePostForPlatform(
  brand: Brand,
  topic: Pick<Topic, "title" | "angle" | "details" | "objective">,
  platform: Platform,
  extraInstruction?: string,
  avoid?: AvoidContext,
): Promise<GeneratedPost> {
  const base = buildUserPrompt(topic, platform, avoid);
  const prompt = extraInstruction?.trim()
    ? `${base}\n\n## Consigne supplémentaire pour cette regénération\n\n${extraInstruction.trim()}`
    : base;

  const result = await callClaudeJson<GeneratedPost>({
    model: MODELS.posts,
    system: buildSystemPrompt(brand),
    prompt,
    schema: POST_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
    effort: "medium",
  });

  return {
    content: result.content.trim(),
    hashtags: dropBrandLookalikes(normalizeHashtags(result.hashtags), brand.name),
    media_suggestion: result.media_suggestion.trim(),
  };
}

function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Supprime les hashtags de marque fabriqués — « #borniaphoto » quand la marque
 * s'appelle Bornia : ce hashtag n'existe pas et personne ne le suit. Le hashtag
 * exact du nom de marque (« #bornia ») est conservé.
 *
 * Volontairement limité aux composés bâtis sur le nom exact. Un filtre flou
 * attrapait aussi les variantes mal orthographiées, mais supprimait au passage
 * « #borneaphoto » (borne à photo, vrai vocabulaire du métier) : effacer un bon
 * hashtag en silence est plus gênant que d'en laisser passer un mauvais, que
 * l'on voit et corrige dans le champ Hashtags.
 */
export function dropBrandLookalikes(
  tags: string[],
  brandName: string,
): string[] {
  const brand = letters(brandName);
  if (brand.length < 4) return tags;

  return tags.filter((tag) => {
    const body = letters(tag);
    if (body === brand) return true;
    return !body.startsWith(brand);
  });
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
  avoidByPlatform?: Partial<Record<Platform, AvoidContext>>,
): Promise<{
  posts: Array<{ platform: Platform; post: GeneratedPost }>;
  failures: Array<{ platform: Platform; message: string }>;
}> {
  const settled = await Promise.allSettled(
    platforms.map((platform) =>
      generatePostForPlatform(
        brand,
        topic,
        platform,
        undefined,
        avoidByPlatform?.[platform],
      ).then((post) => ({
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
