"use client";

import { useActionState } from "react";
import {
  updateBrandIdentity,
  type BrandFormState,
} from "@/app/actions/brands";
import { PLATFORMS, PLATFORM_META } from "@/lib/platforms";
import { SubmitButton } from "@/components/submit-button";
import type { Brand, Platform } from "@/lib/types";

const initialState: BrandFormState = {};

export function BrandIdentityForm({
  brand,
  activePlatforms,
}: {
  brand: Brand;
  activePlatforms: Platform[];
}) {
  const [state, formAction] = useActionState(
    updateBrandIdentity,
    initialState,
  );

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold text-slate-900">Identité</h2>
      <input type="hidden" name="brand_id" value={brand.id} />

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label" htmlFor="name">
            Nom
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={brand.name}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="website_url">
            Site web
          </label>
          <input
            id="website_url"
            name="website_url"
            defaultValue={brand.website_url ?? ""}
            className="field"
            placeholder="bornia.fr"
          />
        </div>
        <div>
          <label className="label" htmlFor="color_hex">
            Couleur
          </label>
          <input
            id="color_hex"
            name="color_hex"
            type="color"
            defaultValue={brand.color_hex ?? "#6366f1"}
            className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">Réseaux actifs</legend>
        <div className="flex flex-wrap gap-3">
          {PLATFORMS.map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                name="platforms"
                value={platform}
                defaultChecked={activePlatforms.includes(platform)}
                className="size-4 accent-indigo-600"
              />
              {PLATFORM_META[platform].label}
            </label>
          ))}
        </div>
        <p className="hint">
          Les réseaux actifs sont pré-cochés à la création d&apos;un sujet, mais
          restent modifiables sujet par sujet.
        </p>
      </fieldset>

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

      <SubmitButton className="btn-secondary" pendingLabel="Enregistrement…">
        Enregistrer l&apos;identité
      </SubmitButton>
    </form>
  );
}
