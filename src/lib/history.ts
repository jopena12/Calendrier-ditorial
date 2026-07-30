import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvoidContext } from "./generate";
import type { Platform } from "./types";

const MAX_TITLES = 20;
const MAX_OPENINGS_PER_PLATFORM = 8;
const MAX_OPENING_CHARS = 140;

function firstLine(content: string): string {
  const line = content
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (!line) return "";
  return line.length > MAX_OPENING_CHARS
    ? `${line.slice(0, MAX_OPENING_CHARS)}…`
    : line;
}

/**
 * Mémoire anti-doublons : ce que la marque a déjà publié.
 * Les titres de sujets évitent de retraiter le même thème, les accroches
 * évitent de réutiliser la même première ligne sur un réseau donné.
 */
export async function loadAvoidContext(
  supabase: SupabaseClient,
  brandId: string,
  platforms: Platform[],
  options?: { excludeTopicId?: string; excludePostId?: string },
): Promise<Partial<Record<Platform, AvoidContext>>> {
  let topicsQuery = supabase
    .from("topics")
    .select("id, title")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(MAX_TITLES);

  if (options?.excludeTopicId) {
    topicsQuery = topicsQuery.neq("id", options.excludeTopicId);
  }

  let postsQuery = supabase
    .from("posts")
    .select("id, platform, content")
    .eq("brand_id", brandId)
    .in("platform", platforms)
    .order("created_at", { ascending: false })
    .limit(MAX_OPENINGS_PER_PLATFORM * platforms.length);

  if (options?.excludePostId) {
    postsQuery = postsQuery.neq("id", options.excludePostId);
  }

  const [{ data: topics }, { data: posts }] = await Promise.all([
    topicsQuery,
    postsQuery,
  ]);

  const titles = ((topics ?? []) as Array<{ title: string }>).map(
    (topic) => topic.title,
  );

  const openings: Partial<Record<Platform, string[]>> = {};
  for (const post of (posts ?? []) as Array<{
    platform: Platform;
    content: string;
  }>) {
    const list = openings[post.platform] ?? [];
    if (list.length >= MAX_OPENINGS_PER_PLATFORM) continue;
    const line = firstLine(post.content);
    if (line) list.push(line);
    openings[post.platform] = list;
  }

  const context: Partial<Record<Platform, AvoidContext>> = {};
  for (const platform of platforms) {
    context[platform] = {
      titles,
      openings: openings[platform] ?? [],
    };
  }
  return context;
}
