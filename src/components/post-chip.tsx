import Link from "next/link";
import { PLATFORM_META, STATUS_META } from "@/lib/platforms";
import type { PostWithRelations } from "@/lib/types";

/** Une case du calendrier = un post : badge plateforme + statut. */
export function PostChip({ post }: { post: PostWithRelations }) {
  const platform = PLATFORM_META[post.platform];
  const status = STATUS_META[post.status];

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block rounded-md border border-slate-200 bg-white px-1.5 py-1 text-left transition hover:border-slate-300 hover:bg-slate-50"
      style={{ borderLeft: `3px solid ${post.brands?.color_hex ?? "#6366f1"}` }}
      title={`${post.brands?.name ?? ""} · ${platform.label} · ${status.label}`}
    >
      <span className="flex items-center gap-1">
        <span
          className="rounded px-1 text-[9px] leading-4 font-bold text-white"
          style={{ backgroundColor: platform.color }}
        >
          {platform.short}
        </span>
        <span
          className={`rounded-full px-1 text-[9px] leading-4 font-medium ring-1 ring-inset ${status.className}`}
        >
          {status.label}
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[11px] leading-4 text-slate-700">
        {post.topics?.title ?? post.content.slice(0, 60)}
      </span>
    </Link>
  );
}
