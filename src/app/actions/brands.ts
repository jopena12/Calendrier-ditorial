"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analyzeBrand } from "@/lib/brand-analysis";
import { PLATFORMS, isPlatform } from "@/lib/platforms";
import type { OnboardingAnswers, Platform } from "@/lib/types";

export type BrandFormState = { error?: string; message?: string };

export type AnalysisState = {
  error?: string;
  proposal?: { brand_profile: string; editorial_guidelines: string };
  gaps?: string[];
  warnings?: string[];
  scrapedUrls?: string[];
  /** Change à chaque analyse : sert de `key` pour réinitialiser le formulaire. */
  runId?: string;
};

function readAnswers(formData: FormData): OnboardingAnswers {
  return {
    activity: String(formData.get("activity") ?? "").trim(),
    targets: String(formData.get("targets") ?? "").trim(),
    tone: String(formData.get("tone") ?? "").trim(),
    forbidden: String(formData.get("forbidden") ?? "").trim(),
    examples: String(formData.get("examples") ?? "").trim(),
  };
}

function readPlatforms(formData: FormData): Platform[] {
  return formData
    .getAll("platforms")
    .map(String)
    .filter(isPlatform);
}

export async function createBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom de la marque est obligatoire." };

  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "#6366f1").trim();
  const platforms = readPlatforms(formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name,
      website_url: websiteUrl || null,
      color_hex: colorHex || "#6366f1",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Création impossible : ${error?.message ?? "erreur inconnue"}` };
  }

  const selected = platforms.length > 0 ? platforms : PLATFORMS;
  const { error: platformError } = await supabase.from("brand_platforms").insert(
    selected.map((platform) => ({
      brand_id: data.id,
      platform,
      active: true,
    })),
  );

  if (platformError) {
    return { error: `Réseaux non enregistrés : ${platformError.message}` };
  }

  revalidatePath("/marques");
  redirect(`/marques/${data.id}`);
}

export async function updateBrandIdentity(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const id = String(formData.get("brand_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Marque introuvable." };
  if (!name) return { error: "Le nom de la marque est obligatoire." };

  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "").trim();
  const platforms = readPlatforms(formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .update({
      name,
      website_url: websiteUrl || null,
      color_hex: colorHex || "#6366f1",
    })
    .eq("id", id);

  if (error) return { error: `Enregistrement impossible : ${error.message}` };

  // Réseaux actifs : upsert de l'état de chaque plateforme.
  const { error: platformError } = await supabase
    .from("brand_platforms")
    .upsert(
      PLATFORMS.map((platform) => ({
        brand_id: id,
        platform,
        active: platforms.includes(platform),
      })),
      { onConflict: "brand_id,platform" },
    );

  if (platformError) {
    return { error: `Réseaux non enregistrés : ${platformError.message}` };
  }

  revalidatePath("/marques");
  revalidatePath(`/marques/${id}`);
  return { message: "Identité de la marque enregistrée." };
}

/**
 * Étapes 1 + 2 de l'onboarding marque : scraping du site et questionnaire.
 * Ne modifie pas `brand_profile` : la proposition est renvoyée pour relecture
 * (étape 3) avant d'être figée.
 */
export async function analyzeBrandAction(
  _prev: AnalysisState,
  formData: FormData,
): Promise<AnalysisState> {
  const id = String(formData.get("brand_id") ?? "");
  if (!id) return { error: "Marque introuvable." };

  const supabase = await createClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .select("id, name, website_url, brand_profile")
    .eq("id", id)
    .single();

  if (error || !brand) return { error: "Marque introuvable." };

  const answers = readAnswers(formData);
  const websiteUrl = String(formData.get("website_url") ?? "").trim();

  // Les réponses au questionnaire sont des données saisies : on les conserve
  // même si l'analyse échoue ensuite.
  await supabase
    .from("brands")
    .update({
      onboarding_answers: answers,
      website_url: websiteUrl || brand.website_url,
    })
    .eq("id", id);

  revalidatePath(`/marques/${id}`);

  try {
    const result = await analyzeBrand({
      name: brand.name,
      websiteUrl: websiteUrl || brand.website_url,
      answers,
      existingProfile: brand.brand_profile,
    });

    return {
      proposal: {
        brand_profile: result.brand_profile,
        editorial_guidelines: result.editorial_guidelines,
      },
      gaps: result.gaps,
      warnings: result.warnings,
      scrapedUrls: result.scrapedUrls,
      runId: `${Date.now()}`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Analyse impossible.",
    };
  }
}

/** Étape 3 : validation / édition manuelle de la fiche. */
export async function saveBrandProfile(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const id = String(formData.get("brand_id") ?? "");
  if (!id) return { error: "Marque introuvable." };

  const brandProfile = String(formData.get("brand_profile") ?? "").trim();
  const guidelines = String(formData.get("editorial_guidelines") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .update({
      brand_profile: brandProfile || null,
      editorial_guidelines: guidelines || null,
    })
    .eq("id", id);

  if (error) return { error: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/marques");
  revalidatePath(`/marques/${id}`);
  return { message: "Fiche de marque enregistrée." };
}

export async function deleteBrand(formData: FormData) {
  const id = String(formData.get("brand_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("brands").delete().eq("id", id);

  revalidatePath("/marques");
  revalidatePath("/calendrier");
  redirect("/marques");
}
