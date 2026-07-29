import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey } from "./env";

/**
 * Deux usages, deux besoins :
 *
 * - `posts` : c'est le volume (un appel par réseau, plusieurs fois par semaine).
 *   Sonnet 5 fait de l'excellent copywriting court quand le brief et la fiche
 *   de marque sont précis, pour environ 40 % du coût d'Opus.
 * - `analysis` : l'onboarding d'une marque n'arrive qu'une fois (puis à chaque
 *   changement d'offre). C'est le texte dont dépend la qualité de TOUS les posts
 *   suivants, donc on ne rogne pas : Opus 5.
 *
 * Surchargeable sans toucher au code via ANTHROPIC_MODEL_POSTS /
 * ANTHROPIC_MODEL_ANALYSIS (ex. tout passer en claude-opus-5).
 */
export const MODELS = {
  posts: process.env.ANTHROPIC_MODEL_POSTS ?? "claude-sonnet-5",
  analysis: process.env.ANTHROPIC_MODEL_ANALYSIS ?? "claude-opus-5",
} as const;

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: anthropicApiKey() });
  }
  return client;
}

export class GenerationError extends Error {}

type JsonCallOptions = {
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
};

/**
 * Appel Claude avec sortie JSON contrainte (structured outputs).
 * Toujours exécuté côté serveur : la clé API n'atteint jamais le client.
 */
export async function callClaudeJson<T>({
  model,
  system,
  prompt,
  schema,
  maxTokens = 8000,
  effort = "medium",
}: JsonCallOptions): Promise<T> {
  const response = await anthropic().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    output_config: {
      effort,
      format: { type: "json_schema", schema },
    },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new GenerationError(
      "Claude a refusé de traiter cette demande. Reformule le sujet ou la fiche de marque.",
    );
  }

  if (response.stop_reason === "max_tokens") {
    throw new GenerationError(
      "La réponse a été tronquée (limite de tokens atteinte). Réessaie avec un brief plus court.",
    );
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (!text.trim()) {
    throw new GenerationError("Claude a renvoyé une réponse vide.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GenerationError("Réponse Claude illisible (JSON invalide).");
  }
}
