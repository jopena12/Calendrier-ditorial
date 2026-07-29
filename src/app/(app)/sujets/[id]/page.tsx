import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteTopic } from "@/app/actions/topics";
import { PLATFORM_META, OBJECTIVES } from "@/lib/platforms";
import { PlatformBadge, StatusBadge, BrandDot } from "@/components/badges";
import { CopyButton } from "@/components/copy-button";
import type { Brand, Post, Topic } from "@/lib/types";

type TopicRow = Topic & {
  brands: Pick<Brand, "id" | "name" | "color_hex"> | null;
};

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: topic }, { data: posts }] = await Promise.all([
    supabase
      .from("topics")
      .select("*, brands ( id, name, color_hex )")
      .eq("id", id)
      .single<TopicRow>(),
    supabase
      .from("posts")
      .select("*")
      .eq("topic_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!topic) notFound();

  const postList = (posts ?? []) as Post[];
  const objectiveLabel =
    OBJECTIVES.find((item) => item.value === topic.objective)?.label ??
    topic.objective;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/sujets" className="text-sm text-slate-500 hover:underline">
          ← Sujets
        </Link>
        <Link href="/calendrier" className="btn-secondary">
          Voir le calendrier
        </Link>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <BrandDot color={topic.brands?.color_hex ?? null} />
          <span className="text-xs text-slate-500">{topic.brands?.name}</span>
          {objectiveLabel && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {objectiveLabel}
            </span>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">{topic.title}</h1>
        {topic.angle && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Angle : </span>
            {topic.angle}
          </p>
        )}
        {topic.details && (
          <p className="text-sm whitespace-pre-wrap text-slate-600">
            <span className="font-medium text-slate-700">Détails : </span>
            {topic.details}
          </p>
        )}
      </div>

      <h2 className="text-sm font-semibold text-slate-900">
        {postList.length} post{postList.length > 1 ? "s" : ""} généré
        {postList.length > 1 ? "s" : ""}
      </h2>

      <div className="space-y-3">
        {postList.map((post) => (
          <article key={post.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <PlatformBadge platform={post.platform} />
              <StatusBadge status={post.status} />
              {post.scheduled_date && (
                <span className="text-xs text-slate-500">
                  {post.scheduled_date}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <CopyButton
                  content={post.content}
                  hashtags={post.hashtags}
                  className="btn-secondary"
                  label="Copier"
                />
                <Link href={`/posts/${post.id}`} className="btn-primary">
                  Ouvrir
                </Link>
              </div>
            </div>

            <p className="text-sm whitespace-pre-wrap text-slate-800">
              {post.content}
            </p>

            {post.hashtags && post.hashtags.length > 0 && (
              <p className="text-sm text-indigo-600">
                {post.hashtags.join(" ")}
              </p>
            )}

            {post.media_suggestion && (
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                  Visuel à créer ({PLATFORM_META[post.platform].label})
                </p>
                <p className="mt-0.5 text-sm text-slate-700">
                  {post.media_suggestion}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>

      <form action={deleteTopic}>
        <input type="hidden" name="topic_id" value={topic.id} />
        <button type="submit" className="btn-danger">
          Supprimer le sujet et ses posts
        </button>
      </form>
    </div>
  );
}
