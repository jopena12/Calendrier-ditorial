"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  generateFromSuggestions,
  suggestTopicsAction,
  type BatchState,
  type SuggestionState,
} from "@/app/actions/topics";
import { OBJECTIVES, PLATFORMS, PLATFORM_META } from "@/lib/platforms";
import { PlatformBadge } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import type { Brand } from "@/lib/types";

const suggestInitial: SuggestionState = {};
const batchInitial: BatchState = {};

type Props = {
  brands: Array<Pick<Brand, "id" | "name" | "color_hex" | "brand_profile">>;
  defaultBrandId?: string;
  today: string;
  incompleteBrands: number;
};

export function AutoPlanner({
  brands,
  defaultBrandId,
  today,
  incompleteBrands,
}: Props) {
  const [suggestState, suggestAction] = useActionState(
    suggestTopicsAction,
    suggestInitial,
  );
  const [batchState, batchAction] = useActionState(
    generateFromSuggestions,
    batchInitial,
  );

  const initialBrand =
    brands.find((brand) => brand.id === defaultBrandId) ?? brands[0];
  const [brandId, setBrandId] = useState(initialBrand.id);

  const suggestions = suggestState.suggestions ?? [];

  return (
    <>
      <section className="card space-y-4 p-5">
        <form action={suggestAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="label" htmlFor="brand_id">
                Marque
              </label>
              <select
                id="brand_id"
                name="brand_id"
                className="field"
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
              >
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {incompleteBrands > 0 && (
                <p className="hint">
                  {incompleteBrands} marque{incompleteBrands > 1 ? "s" : ""} sans
                  fiche {incompleteBrands > 1 ? "sont" : "est"} masquée
                  {incompleteBrands > 1 ? "s" : ""} ici.
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="count">
                Nombre de sujets
              </label>
              <select
                id="count"
                name="count"
                className="field"
                defaultValue="5"
              >
                {[3, 5, 8, 10].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {suggestState.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {suggestState.error}
            </p>
          )}

          <SubmitButton pendingLabel="Recherche de sujets (30 à 60 s)…">
            Proposer des sujets
          </SubmitButton>
          <p className="hint">
            Cette étape ne coûte qu&apos;un appel (~0,05 €) et n&apos;enregistre
            rien.
          </p>
        </form>
      </section>

      {suggestions.length > 0 && (
        <form
          key={suggestState.runId}
          action={batchAction}
          className="card space-y-4 p-5"
        >
          <input
            type="hidden"
            name="brand_id"
            value={suggestState.brandId ?? brandId}
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {suggestions.length} sujets proposés
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Décoche ceux qui ne t&apos;intéressent pas. Les réseaux indiqués
              sont ceux que Claude juge pertinents pour chaque sujet.
            </p>
          </div>

          <ul className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const objectiveLabel =
                OBJECTIVES.find((item) => item.value === suggestion.objective)
                  ?.label ?? suggestion.objective;
              return (
                <li
                  key={`${suggestion.title}-${index}`}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <label className="flex gap-3">
                    <input
                      type="checkbox"
                      name="selected"
                      value={JSON.stringify(suggestion)}
                      defaultChecked
                      className="mt-0.5 size-4 shrink-0 accent-indigo-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {suggestion.title}
                      </span>
                      {suggestion.angle && (
                        <span className="mt-0.5 block text-sm text-slate-600">
                          {suggestion.angle}
                        </span>
                      )}
                      {suggestion.details && (
                        <span className="mt-1 block text-xs text-slate-500">
                          Détails : {suggestion.details}
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {suggestion.platforms.map((platform) => (
                          <PlatformBadge
                            key={platform}
                            platform={platform}
                            size="xs"
                          />
                        ))}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          {objectiveLabel}
                        </span>
                      </span>
                      {suggestion.needs_input && (
                        <span className="mt-1.5 block rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          À compléter avant publication :{" "}
                          {suggestion.needs_input}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <fieldset className="rounded-lg bg-slate-50 p-3">
            <legend className="label">
              Forcer les réseaux (optionnel)
            </legend>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="override_platforms"
                    value={platform}
                    className="size-4 accent-indigo-600"
                  />
                  {PLATFORM_META[platform].label}
                </label>
              ))}
            </div>
            <p className="hint">
              Laisse vide pour respecter le choix de réseaux fait par Claude
              sujet par sujet.
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="start_date">
                Étaler à partir du
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={today}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="spacing">
                Un sujet tous les
              </label>
              <select
                id="spacing"
                name="spacing"
                className="field"
                defaultValue="3"
              >
                {[1, 2, 3, 4, 7].map((value) => (
                  <option key={value} value={value}>
                    {value} jour{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {batchState.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {batchState.error}
            </p>
          )}
          {batchState.message && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {batchState.message}{" "}
              <Link href="/calendrier" className="underline">
                Voir le calendrier
              </Link>
            </p>
          )}

          <SubmitButton pendingLabel="Rédaction des posts (1 à 4 min)…">
            Générer les posts des sujets cochés
          </SubmitButton>
          <p className="hint">
            Les sujets sont traités les uns après les autres pour que chacun
            connaisse les précédents et ne les répète pas. Compte ~0,02 € par
            post.
          </p>
        </form>
      )}
    </>
  );
}
