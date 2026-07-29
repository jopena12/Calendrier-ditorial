"use client";

import { useActionState, useState } from "react";
import { updatePost, type PostState } from "@/app/actions/posts";
import { STATUSES, STATUS_META } from "@/lib/platforms";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import type { PostWithRelations } from "@/lib/types";

const initialState: PostState = {};

export function PostEditor({
  post,
  platformLabel,
}: {
  post: PostWithRelations;
  platformLabel: string;
}) {
  const [state, formAction] = useActionState(updatePost, initialState);

  // Copie toujours ce qui est affiché à l'écran, même avant enregistrement.
  const [content, setContent] = useState(post.content);
  const [hashtags, setHashtags] = useState((post.hashtags ?? []).join(" "));

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <input type="hidden" name="post_id" value={post.id} />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Contenu {platformLabel}
        </h2>
        <span className="text-xs text-slate-400">
          {content.length} caractères
        </span>
      </div>

      <textarea
        name="content"
        rows={16}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="field resize-y leading-relaxed"
      />

      <div>
        <label className="label" htmlFor="hashtags">
          Hashtags
        </label>
        <input
          id="hashtags"
          name="hashtags"
          value={hashtags}
          onChange={(event) => setHashtags(event.target.value)}
          className="field"
          placeholder="#photobooth #mariage"
        />
        <p className="hint">Séparés par un espace ou une virgule.</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-3">
        <label className="label" htmlFor="media_suggestion">
          Visuel à créer (note interne — non copiée avec le post)
        </label>
        <textarea
          id="media_suggestion"
          name="media_suggestion"
          rows={3}
          defaultValue={post.media_suggestion ?? ""}
          className="field resize-y"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="scheduled_date">
            Date de publication
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={post.scheduled_date ?? ""}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Statut
          </label>
          <select
            id="status"
            name="status"
            defaultValue={post.status}
            className="field"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
          <p className="hint">
            Passe en « Publié » une fois posté à la main sur le réseau.
          </p>
        </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingLabel="Enregistrement…">
          Enregistrer
        </SubmitButton>
        <CopyButton
          content={content}
          hashtags={hashtags.split(/[\s,]+/).filter(Boolean)}
          className="btn-secondary"
        />
      </div>
    </form>
  );
}
