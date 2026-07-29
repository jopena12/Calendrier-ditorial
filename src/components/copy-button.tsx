"use client";

import { useState } from "react";

/**
 * Copie le texte + les hashtags, prêts à coller.
 * La suggestion média reste volontairement en dehors : c'est une note interne.
 */
export function CopyButton({
  content,
  hashtags,
  label = "Copier le post",
  className = "btn-primary",
}: {
  content: string;
  hashtags?: string[] | null;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  const payload = [content.trim(), (hashtags ?? []).join(" ").trim()]
    .filter(Boolean)
    .join("\n\n");

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setState("done");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {state === "done"
        ? "Copié ✓"
        : state === "error"
          ? "Copie refusée par le navigateur"
          : label}
    </button>
  );
}
