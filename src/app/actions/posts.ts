"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generatePostForPlatform, normalizeHashtags } from "@/lib/generate";
import { STATUSES } from "@/lib/platforms";
import type { Brand, Platform, PostStatus, Topic } from "@/lib/types";

export type PostState = { error?: string; message?: string };

function parseHashtags(raw: string): string[] {
  return normalizeHashtags(raw.split(/[\s,]+/));
}

export async function updatePost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const id = String(formData.get("post_id") ?? "");
  if (!id) return { error: "Post introuvable." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Le contenu ne peut pas être vide." };

  const hashtags = parseHashtags(String(formData.get("hashtags") ?? ""));
  const mediaSuggestion = String(formData.get("media_suggestion") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "draft");
  const status = (STATUSES as string[]).includes(statusRaw)
    ? (statusRaw as PostStatus)
    : "draft";

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({
      content,
      hashtags,
      media_suggestion: mediaSuggestion || null,
      scheduled_date: scheduledDate || null,
      status,
    })
    .eq("id", id);

  if (error) return { error: `Enregistrement impossible : ${error.message}` };

  revalidatePath("/calendrier");
  revalidatePath(`/posts/${id}`);
  return { message: "Post enregistré." };
}

/** Changement de statut rapide (depuis la fiche post ou le calendrier). */
export async function setPostStatus(formData: FormData) {
  const id = String(formData.get("post_id") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!id || !(STATUSES as string[]).includes(statusRaw)) return;

  const supabase = await createClient();
  await supabase
    .from("posts")
    .update({ status: statusRaw as PostStatus })
    .eq("id", id);

  revalidatePath("/calendrier");
  revalidatePath(`/posts/${id}`);
}

export async function setPostDate(formData: FormData) {
  const id = String(formData.get("post_id") ?? "");
  if (!id) return;
  const date = String(formData.get("scheduled_date") ?? "").trim();

  const supabase = await createClient();
  await supabase
    .from("posts")
    .update({ scheduled_date: date || null })
    .eq("id", id);

  revalidatePath("/calendrier");
  revalidatePath(`/posts/${id}`);
}

/** Régénération d'un post individuel, avec consigne facultative. */
export async function regeneratePost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const id = String(formData.get("post_id") ?? "");
  if (!id) return { error: "Post introuvable." };
  const instruction = String(formData.get("instruction") ?? "").trim();

  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, platform, brand_id, topic_id")
    .eq("id", id)
    .single<{
      id: string;
      platform: Platform;
      brand_id: string;
      topic_id: string;
    }>();

  if (error || !post) return { error: "Post introuvable." };

  const [{ data: brand }, { data: topic }] = await Promise.all([
    supabase.from("brands").select("*").eq("id", post.brand_id).single<Brand>(),
    supabase
      .from("topics")
      .select("title, angle, details, objective")
      .eq("id", post.topic_id)
      .single<Pick<Topic, "title" | "angle" | "details" | "objective">>(),
  ]);

  if (!brand || !topic) return { error: "Marque ou sujet introuvable." };

  try {
    const generated = await generatePostForPlatform(
      brand,
      topic,
      post.platform,
      instruction,
    );

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        content: generated.content,
        hashtags: generated.hashtags,
        media_suggestion: generated.media_suggestion,
      })
      .eq("id", id);

    if (updateError) {
      return { error: `Enregistrement impossible : ${updateError.message}` };
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Régénération impossible.",
    };
  }

  revalidatePath("/calendrier");
  revalidatePath(`/posts/${id}`);
  return { message: "Post régénéré." };
}

export async function deletePost(formData: FormData) {
  const id = String(formData.get("post_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("topic_id")
    .eq("id", id)
    .single<{ topic_id: string }>();

  await supabase.from("posts").delete().eq("id", id);

  revalidatePath("/calendrier");
  if (data?.topic_id) {
    revalidatePath(`/sujets/${data.topic_id}`);
    redirect(`/sujets/${data.topic_id}`);
  }
  redirect("/calendrier");
}
