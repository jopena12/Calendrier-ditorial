import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlatformBadge, BrandDot } from "@/components/badges";
import type { Platform, Topic } from "@/lib/types";

type TopicRow = Topic & {
  brands: { id: string; name: string; color_hex: string | null } | null;
  posts: { id: string }[] | null;
};

export default async function TopicsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .select("*, brands ( id, name, color_hex ), posts ( id )")
    .order("created_at", { ascending: false })
    .limit(100);

  const topics = (data ?? []) as TopicRow[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Sujets</h1>
          <p className="text-sm text-slate-500">
            Chaque sujet regroupe les posts déclinés par réseau.
          </p>
        </div>
        <Link href="/sujets/nouveau" className="btn-primary">
          Nouveau sujet
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Lecture impossible : {error.message}
        </p>
      )}

      {topics.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">
          Aucun sujet pour l&apos;instant.
        </div>
      ) : (
        <ul className="space-y-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/sujets/${topic.id}`}
                className="card flex flex-wrap items-center gap-3 p-4 transition hover:border-slate-300"
              >
                <BrandDot color={topic.brands?.color_hex ?? null} />
                <span className="text-sm font-medium text-slate-900">
                  {topic.title}
                </span>
                <span className="text-xs text-slate-500">
                  {topic.brands?.name}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  {(topic.selected_platforms ?? []).map((platform) => (
                    <PlatformBadge
                      key={platform}
                      platform={platform as Platform}
                      size="xs"
                    />
                  ))}
                </span>
                <span className="text-xs text-slate-400">
                  {topic.posts?.length ?? 0} post
                  {(topic.posts?.length ?? 0) > 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
