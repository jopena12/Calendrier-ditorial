"use client";

import { useActionState } from "react";
import { regeneratePost, type PostState } from "@/app/actions/posts";
import { SubmitButton } from "@/components/submit-button";

const initialState: PostState = {};

export function RegenerateForm({
  postId,
  platformLabel,
}: {
  postId: string;
  platformLabel: string;
}) {
  const [state, formAction] = useActionState(regeneratePost, initialState);

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Régénérer ce post {platformLabel}
      </h2>
      <p className="text-sm text-slate-500">
        Réécrit le contenu depuis le brief du sujet et la fiche de la marque. Le
        texte actuel sera remplacé.
      </p>

      <input type="hidden" name="post_id" value={postId} />

      <div>
        <label className="label" htmlFor="instruction">
          Consigne supplémentaire (optionnel)
        </label>
        <input
          id="instruction"
          name="instruction"
          className="field"
          placeholder="Plus court, commence par une question, insiste sur le délai…"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}

      <SubmitButton
        className="btn-secondary"
        pendingLabel="Régénération (20 à 60 s)…"
      >
        Régénérer
      </SubmitButton>
    </form>
  );
}
