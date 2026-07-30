"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generatePostsForTopic } from "@/lib/generate";
import { loadAvoidContext } from "@/lib/history";
import { suggestTopics, type TopicSuggestion } from "@/lib/suggest";
import { isPlatform } from "@/lib/platforms";
import { addDays, parseISODate, toISODate } from "@/lib/date";
import type { Brand, Platform } from "@/lib/types";

export type TopicState = { error?: string; warning?: string };

export type SuggestionState = {
  error?: string;
  brandId?: string;
  suggestions?: TopicSuggestion[];
  /** Change à chaque proposition : sert de `key` pour réinitialiser le formulaire. */
  runId?: string;
};

export type BatchState = { error?: string; message?: string };

function readPlatforms(formData: FormData, field = "platforms"): Platform[] {
  return formData.getAll(field).map(String).filter(isPlatform);
}

async function loadBrand(brandId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .single<Brand>();
  return { supabase, brand: error ? null : data };
}

/**
 * Onboarding sujet (section 4.2) + génération multi-plateforme.
 * Un post est créé uniquement pour chaque réseau coché.
 */
export async function createTopicAndGenerate(
  _prev: TopicState,
  formData: FormData,
): Promise<TopicState> {
  const brandId = String(formData.get("brand_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const angle = String(formData.get("angle") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const platforms = readPlatforms(formData);

  if (!brandId) return { error: "Choisis une marque." };
  if (!title) return { error: "Décris le sujet en une phrase." };
  if (platforms.length === 0) {
    return { error: "Sélectionne au moins un réseau social." };
  }

  const { supabase, brand } = await loadBrand(brandId);
  if (!brand) return { error: "Marque introuvable." };

  const topicInput = { title, angle, details, objective };
  const avoid = await loadAvoidContext(supabase, brandId, platforms);

  let generated;
  try {
    generated = await generatePostsForTopic(
      brand,
      topicInput,
      platforms,
      avoid,
    );
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Génération impossible.",
    };
  }

  if (generated.posts.length === 0) {
    const detail = generated.failures.map((f) => f.message).join(" · ");
    return { error: `Aucun post généré. ${detail}` };
  }

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({
      brand_id: brandId,
      title,
      angle: angle || null,
      details: details || null,
      objective: objective || null,
      selected_platforms: platforms,
    })
    .select("id")
    .single();

  if (topicError || !topic) {
    return { error: `Sujet non enregistré : ${topicError?.message ?? "erreur"}` };
  }

  const { error: postsError } = await supabase.from("posts").insert(
    generated.posts.map(({ platform, post }) => ({
      topic_id: topic.id,
      brand_id: brandId,
      platform,
      content: post.content,
      hashtags: post.hashtags,
      media_suggestion: post.media_suggestion,
      status: "draft" as const,
      scheduled_date: scheduledDate || null,
    })),
  );

  if (postsError) {
    return { error: `Posts non enregistrés : ${postsError.message}` };
  }

  revalidatePath("/calendrier");
  revalidatePath("/sujets");
  redirect(`/sujets/${topic.id}`);
}

/**
 * Mode auto, étape 1 : Claude propose des sujets à partir de la fiche de
 * marque, en excluant ceux déjà traités. Un seul appel, rien n'est enregistré.
 */
export async function suggestTopicsAction(
  _prev: SuggestionState,
  formData: FormData,
): Promise<SuggestionState> {
  const brandId = String(formData.get("brand_id") ?? "");
  const count = Math.min(
    Math.max(Number(formData.get("count") ?? 5) || 5, 1),
    10,
  );

  if (!brandId) return { error: "Choisis une marque." };

  const { supabase, brand } = await loadBrand(brandId);
  if (!brand) return { error: "Marque introuvable." };

  const { data: covered } = await supabase
    .from("topics")
    .select("title, angle, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(40);

  try {
    const suggestions = await suggestTopics(brand, covered ?? [], count);
    if (suggestions.length === 0) {
      return { error: "Aucun sujet proposé. Réessaie." };
    }
    return {
      brandId,
      suggestions,
      runId: `${Date.now()}`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Proposition impossible.",
    };
  }
}

/**
 * Mode auto, étape 2 : génère et enregistre les posts des sujets retenus,
 * en étalant les dates de publication.
 */
export async function generateFromSuggestions(
  _prev: BatchState,
  formData: FormData,
): Promise<BatchState> {
  const brandId = String(formData.get("brand_id") ?? "");
  if (!brandId) return { error: "Marque introuvable." };

  const selected = formData.getAll("selected").map(String);
  if (selected.length === 0) {
    return { error: "Coche au moins un sujet à générer." };
  }

  let suggestions: TopicSuggestion[];
  try {
    suggestions = selected.map((raw) => JSON.parse(raw) as TopicSuggestion);
  } catch {
    return { error: "Sujets illisibles. Relance la proposition." };
  }

  const overridePlatforms = readPlatforms(formData, "override_platforms");
  const startDateRaw = String(formData.get("start_date") ?? "").trim();
  const spacing = Math.min(
    Math.max(Number(formData.get("spacing") ?? 3) || 3, 1),
    14,
  );

  const { supabase, brand } = await loadBrand(brandId);
  if (!brand) return { error: "Marque introuvable." };

  const startDate = startDateRaw ? parseISODate(startDateRaw) : null;
  let created = 0;
  const failures: string[] = [];

  // L'hébergeur coupe la requête à maxDuration (300 s sur Vercel Hobby). On
  // s'arrête avant plutôt que de perdre le travail déjà fait dans un timeout :
  // les sujets non traités sont signalés, il suffit de relancer.
  const deadline = Date.now() + 240_000;

  // Séquentiel : chaque sujet doit voir les précédents dans sa mémoire
  // anti-doublons, sinon le lot se répète lui-même.
  for (const [index, suggestion] of suggestions.entries()) {
    if (Date.now() > deadline) {
      const remaining = suggestions.length - index;
      failures.push(
        `${remaining} sujet${remaining > 1 ? "s" : ""} non traité${
          remaining > 1 ? "s" : ""
        } : limite de temps de l'hébergeur atteinte. Relance une proposition pour les générer.`,
      );
      break;
    }

    const platforms =
      overridePlatforms.length > 0
        ? overridePlatforms
        : suggestion.platforms.filter(isPlatform);

    if (platforms.length === 0) {
      failures.push(`« ${suggestion.title} » : aucun réseau retenu.`);
      continue;
    }

    const avoid = await loadAvoidContext(supabase, brandId, platforms);

    let generated;
    try {
      generated = await generatePostsForTopic(
        brand,
        suggestion,
        platforms,
        avoid,
      );
    } catch (err) {
      failures.push(
        `« ${suggestion.title} » : ${err instanceof Error ? err.message : "échec"}`,
      );
      continue;
    }

    if (generated.posts.length === 0) {
      failures.push(`« ${suggestion.title} » : aucun post généré.`);
      continue;
    }

    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .insert({
        brand_id: brandId,
        title: suggestion.title,
        angle: suggestion.angle || null,
        details: suggestion.details || null,
        objective: suggestion.objective || null,
        selected_platforms: platforms,
      })
      .select("id")
      .single();

    if (topicError || !topic) {
      failures.push(`« ${suggestion.title} » : sujet non enregistré.`);
      continue;
    }

    const scheduledDate = startDate
      ? toISODate(addDays(startDate, index * spacing))
      : null;

    const { error: postsError } = await supabase.from("posts").insert(
      generated.posts.map(({ platform, post }) => ({
        topic_id: topic.id,
        brand_id: brandId,
        platform,
        content: post.content,
        hashtags: post.hashtags,
        media_suggestion: post.media_suggestion,
        status: "draft" as const,
        scheduled_date: scheduledDate,
      })),
    );

    if (postsError) {
      failures.push(`« ${suggestion.title} » : posts non enregistrés.`);
      continue;
    }

    created += 1;
  }

  revalidatePath("/calendrier");
  revalidatePath("/sujets");

  if (created === 0) {
    return { error: `Rien n'a été généré. ${failures.join(" · ")}` };
  }

  if (failures.length > 0) {
    return {
      message: `${created} sujet${created > 1 ? "s" : ""} généré${
        created > 1 ? "s" : ""
      }. Échecs : ${failures.join(" · ")}`,
    };
  }

  redirect("/calendrier");
}

export async function deleteTopic(formData: FormData) {
  const id = String(formData.get("topic_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("topics").delete().eq("id", id);

  revalidatePath("/calendrier");
  revalidatePath("/sujets");
  redirect("/sujets");
}
