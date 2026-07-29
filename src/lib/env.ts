function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Voir .env.example.`,
    );
  }
  return value;
}

/** URL + clé publique Supabase (utilisables côté client). */
export function supabasePublicConfig() {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    key: required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

/** Clé Anthropic — serveur uniquement, jamais exposée au client. */
export function anthropicApiKey(): string {
  return required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY);
}
