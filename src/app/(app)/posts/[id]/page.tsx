import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_META } from "@/lib/platforms";
import { BrandDot, PlatformBadge, StatusBadge } from "@/components/badges";
import { PostEditor } from "./post-editor";
import { RegenerateForm } from "./regenerate-form";
import { deletePost } from "@/app/actions/posts";
import type { PostWithRelations } from "@/lib/types";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select(
      "*, brands ( id, name, color_hex ), topics ( id, title, angle, details, objective )",
    )
    .eq("id", id)
    .single<PostWithRelations>();

  if (!data) notFound();

  const meta = PLATFORM_META[data.platform];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={data.topics ? `/sujets/${data.topics.id}` : "/calendrier"}
          className="text-sm text-slate-500 hover:underline"
        >
          ← {data.topics ? "Sujet" : "Calendrier"}
        </Link>
        <Link href="/calendrier" className="btn-secondary">
          Calendrier
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PlatformBadge platform={data.platform} />
        <StatusBadge status={data.status} />
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <BrandDot color={data.brands?.color_hex ?? null} />
          {data.brands?.name}
        </span>
      </div>

      {data.topics && (
        <div className="card p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">
            Sujet
          </p>
          <p className="text-sm font-medium text-slate-900">
            {data.topics.title}
          </p>
          {data.topics.angle && (
            <p className="mt-1 text-sm text-slate-600">{data.topics.angle}</p>
          )}
        </div>
      )}

      <PostEditor post={data} platformLabel={meta.label} />

      <RegenerateForm postId={data.id} platformLabel={meta.label} />

      <form action={deletePost}>
        <input type="hidden" name="post_id" value={data.id} />
        <button type="submit" className="btn-danger">
          Supprimer ce post
        </button>
      </form>
    </div>
  );
}
