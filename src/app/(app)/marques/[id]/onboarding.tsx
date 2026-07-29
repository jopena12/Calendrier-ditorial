"use client";

import { useActionState } from "react";
import {
  analyzeBrandAction,
  saveBrandProfile,
  type AnalysisState,
  type BrandFormState,
} from "@/app/actions/brands";
import { SubmitButton } from "@/components/submit-button";
import type { Brand } from "@/lib/types";

const analysisInitial: AnalysisState = {};
const saveInitial: BrandFormState = {};

const QUESTIONS = [
  {
    name: "activity",
    label: "Quelle activité, quels produits / services précis ?",
    placeholder:
      "Ex : location de photobooth pour mariages et événements d'entreprise, 3 formules…",
  },
  {
    name: "targets",
    label: "Qui sont les clients cibles (profil, besoins, freins) ?",
    placeholder:
      "Ex : couples 25-35 ans en Île-de-France, cherchent une animation ; frein = budget et logistique…",
  },
  {
    name: "tone",
    label: "Ton de communication souhaité ?",
    placeholder: "Ex : chaleureux et complice, tutoiement, pas corporate…",
  },
  {
    name: "forbidden",
    label: "Ce qu'il ne faut jamais dire / mentionner ?",
    placeholder:
      "Ex : ne jamais parler de Vumos sur les pages publiques KMI, ne jamais annoncer de prix…",
  },
  {
    name: "examples",
    label: "Exemples de posts qui ont bien marché (si existants) ?",
    placeholder: "Colle ici 1 à 3 posts, tels quels.",
  },
] as const;

export function BrandOnboarding({ brand }: { brand: Brand }) {
  const [analysis, analyzeAction] = useActionState(
    analyzeBrandAction,
    analysisInitial,
  );
  const [saveState, saveAction] = useActionState(saveBrandProfile, saveInitial);

  const answers = brand.onboarding_answers ?? {};
  const proposal = analysis.proposal;

  return (
    <>
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Onboarding marque — analyse & questionnaire
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            L&apos;analyse lit les pages clés du site (accueil, à propos, offres,
            tarifs) et les combine à tes réponses pour produire la fiche de
            connaissance. Rien n&apos;est enregistré dans la fiche avant ta
            validation.
          </p>
        </div>

        <form action={analyzeAction} className="space-y-4">
          <input type="hidden" name="brand_id" value={brand.id} />

          <div>
            <label className="label" htmlFor="onboarding_website">
              URL à analyser
            </label>
            <input
              id="onboarding_website"
              name="website_url"
              defaultValue={brand.website_url ?? ""}
              className="field"
              placeholder="bornia.fr"
            />
            <p className="hint">
              Laisse vide si la marque n&apos;a pas de site : le questionnaire
              suffit.
            </p>
          </div>

          {QUESTIONS.map((question) => (
            <div key={question.name}>
              <label className="label" htmlFor={question.name}>
                {question.label}
              </label>
              <textarea
                id={question.name}
                name={question.name}
                rows={3}
                defaultValue={answers[question.name] ?? ""}
                className="field resize-y"
                placeholder={question.placeholder}
              />
            </div>
          ))}

          {analysis.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {analysis.error}
            </p>
          )}

          <SubmitButton pendingLabel="Analyse en cours (30 à 60 s)…">
            Analyser et proposer une fiche
          </SubmitButton>
        </form>

        {analysis.warnings && analysis.warnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {analysis.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        {analysis.scrapedUrls && analysis.scrapedUrls.length > 0 && (
          <p className="text-xs text-slate-500">
            Pages analysées : {analysis.scrapedUrls.join(", ")}
          </p>
        )}

        {analysis.gaps && analysis.gaps.length > 0 && (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-700">
              Informations à confirmer manuellement
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
              {analysis.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Fiche de connaissance {proposal ? "— proposition à valider" : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ce texte est le contexte permanent envoyé à Claude pour chaque post
            de la marque. Modifiable à tout moment.
          </p>
        </div>

        <form
          key={analysis.runId ?? "current"}
          action={saveAction}
          className="space-y-4"
        >
          <input type="hidden" name="brand_id" value={brand.id} />

          <div>
            <label className="label" htmlFor="brand_profile">
              brand_profile
            </label>
            <textarea
              id="brand_profile"
              name="brand_profile"
              rows={18}
              defaultValue={proposal?.brand_profile ?? brand.brand_profile ?? ""}
              className="field resize-y font-mono text-xs leading-relaxed"
              placeholder="Positionnement, offres, cibles, ton, points forts, éléments de langage…"
            />
          </div>

          <div>
            <label className="label" htmlFor="editorial_guidelines">
              editorial_guidelines
            </label>
            <textarea
              id="editorial_guidelines"
              name="editorial_guidelines"
              rows={10}
              defaultValue={
                proposal?.editorial_guidelines ??
                brand.editorial_guidelines ??
                ""
              }
              className="field resize-y font-mono text-xs leading-relaxed"
              placeholder="Interdits, longueur cible par réseau, emojis, CTA type…"
            />
          </div>

          {saveState.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveState.error}
            </p>
          )}
          {saveState.message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {saveState.message}
            </p>
          )}

          <SubmitButton pendingLabel="Enregistrement…">
            {proposal ? "Valider et enregistrer la fiche" : "Enregistrer la fiche"}
          </SubmitButton>
        </form>
      </section>
    </>
  );
}
