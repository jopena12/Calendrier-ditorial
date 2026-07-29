import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey } from "./env";

export const MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: anthropicApiKey() });
  }
  return client;
}

export class GenerationError extends Error {}

type JsonCallOptions = {
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
  system,
  prompt,
  schema,
  maxTokens = 8000,
  effort = "medium",
}: JsonCallOptions): Promise<T> {
  const response = await anthropic().messages.create({
    model: MODEL,
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
