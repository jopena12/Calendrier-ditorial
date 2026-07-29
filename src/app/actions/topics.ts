"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generatePostsForTopic } from "@/lib/generate";
import { isPlatform } from "@/lib/platforms";
import type { Brand, Platform } from "@/lib/types";

export type TopicState = { error?: string; warning?: string };

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

  const platforms: Platform[] = formData
    .getAll("platforms")
    .map(String)
    .filter(isPlatform);

  if (!brandId) return { error: "Choisis une marque." };
  if (!title) return { error: "Décris le sujet en une phrase." };
  if (platforms.length === 0) {
    return { error: "Sélectionne au moins un réseau social." };
  }

  const supabase = await createClient();

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .single<Brand>();

  if (brandError || !brand) return { error: "Marque introuvable." };

  const topicInput = { title, angle, details, objective };

  let generated;
  try {
    generated = await generatePostsForTopic(brand, topicInput, platforms);
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

export async function deleteTopic(formData: FormData) {
  const id = String(formData.get("topic_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("topics").delete().eq("id", id);

  revalidatePath("/calendrier");
  revalidatePath("/sujets");
  redirect("/sujets");
}
