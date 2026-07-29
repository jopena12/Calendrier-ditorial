"use client";

import { useActionState, useState } from "react";
import {
  createTopicAndGenerate,
  type TopicState,
} from "@/app/actions/topics";
import { OBJECTIVES, PLATFORMS, PLATFORM_META } from "@/lib/platforms";
import { SubmitButton } from "@/components/submit-button";
import type { Brand, Platform } from "@/lib/types";

const initialState: TopicState = {};

type Props = {
  brands: Array<Pick<Brand, "id" | "name" | "color_hex" | "brand_profile">>;
  activeByBrand: Record<string, Platform[]>;
  defaultBrandId?: string;
  defaultDate?: string;
};

export function NewTopicForm({
  brands,
  activeByBrand,
  defaultBrandId,
  defaultDate,
}: Props) {
  const [state, formAction] = useActionState(
    createTopicAndGenerate,
    initialState,
  );

  const firstBrand =
    brands.find((brand) => brand.id === defaultBrandId) ?? brands[0];
  const [brandId, setBrandId] = useState(firstBrand.id);

  const activePlatforms = activeByBrand[brandId] ?? PLATFORMS;
  const selectedBrand = brands.find((brand) => brand.id === brandId);
  const missingProfile = !selectedBrand?.brand_profile?.trim();

  return (
    <form action={formAction} className="card space-y-5 p-5">
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
        {missingProfile && (
          <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Cette marque n&apos;a pas encore de fiche de connaissance. Les posts
            risquent d&apos;être générique
            {"s"} — fais son onboarding d&apos;abord.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="title">
          De quoi veux-tu parler exactement ? (une phrase)
        </label>
        <input
          id="title"
          name="title"
          required
          className="field"
          placeholder="Nouvelle formule photobooth pour les mariages d'été"
        />
      </div>

      <div>
        <label className="label" htmlFor="angle">
          Quel est l&apos;angle ou l&apos;info clé à faire passer ?
        </label>
        <textarea
          id="angle"
          name="angle"
          rows={2}
          className="field resize-y"
          placeholder="L'installation prend 15 minutes et ne demande aucune logistique aux mariés."
        />
      </div>

      <div>
        <label className="label" htmlFor="details">
          Détails précis à inclure (chiffres, offre, date, lieu…)
        </label>
        <textarea
          id="details"
          name="details"
          rows={3}
          className="field resize-y"
          placeholder="349 € la soirée, réservation jusqu'au 30 juin, livraison incluse en Île-de-France."
        />
        <p className="hint">
          Tout ce qui n&apos;est pas écrit ici ne sera pas inventé : pas de chiffre
          sorti de nulle part.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="objective">
            Objectif du post
          </label>
          <select
            id="objective"
            name="objective"
            className="field"
            defaultValue="informer"
          >
            {OBJECTIVES.map((objective) => (
              <option key={objective.value} value={objective.value}>
                {objective.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="scheduled_date">
            Date de publication prévue (optionnel)
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={defaultDate}
            className="field"
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">Réseaux à décliner</legend>
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
                key={`${brandId}-${platform}`}
                className="size-4 accent-indigo-600"
              />
              {PLATFORM_META[platform].label}
            </label>
          ))}
        </div>
        <p className="hint">
          Un post sera généré uniquement pour les réseaux cochés.
        </p>
      </fieldset>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Génération en cours (30 à 90 s)…">
        Générer les posts
      </SubmitButton>
    </form>
  );
}
