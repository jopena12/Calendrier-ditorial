"use client";

import { useActionState } from "react";
import { createBrand, type BrandFormState } from "@/app/actions/brands";
import { PLATFORMS, PLATFORM_META } from "@/lib/platforms";
import { SubmitButton } from "@/components/submit-button";

const initialState: BrandFormState = {};

export function NewBrandForm() {
  const [state, formAction] = useActionState(createBrand, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="name">
          Nom de la marque
        </label>
        <input
          id="name"
          name="name"
          required
          className="field"
          placeholder="Studio By KM"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="website_url">
            Site web (optionnel)
          </label>
          <input
            id="website_url"
            name="website_url"
            className="field"
            placeholder="studiobykm.com"
          />
          <p className="hint">
            Sert à l&apos;analyse automatique du positionnement et des offres.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="color_hex">
            Couleur
          </label>
          <input
            id="color_hex"
            name="color_hex"
            type="color"
            defaultValue="#6366f1"
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
                defaultChecked
                className="size-4 accent-indigo-600"
              />
              {PLATFORM_META[platform].label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Création…">Créer la marque</SubmitButton>
    </form>
  );
}
