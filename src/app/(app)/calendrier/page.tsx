import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  WEEKDAYS,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  monthGrid,
  monthLabel,
  parseISODate,
  toISODate,
  viewRange,
  weekDays,
  weekLabel,
} from "@/lib/date";
import { PostChip } from "@/components/post-chip";
import { CalendarFilters } from "./filters";
import type { Brand, PostWithRelations } from "@/lib/types";

type SearchParams = {
  view?: string;
  date?: string;
  brand?: string;
  status?: string;
};

const POST_SELECT =
  "*, brands ( id, name, color_hex ), topics ( id, title, angle, details, objective )";

function buildHref(base: SearchParams, overrides: SearchParams): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/calendrier?${query}` : "/calendrier";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const anchor = sp.date ? parseISODate(sp.date) : new Date();
  const today = new Date();

  const { from, to } = viewRange(view, anchor);

  const supabase = await createClient();

  let scheduledQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("created_at", { ascending: true });

  let unscheduledQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .is("scheduled_date", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (sp.brand) {
    scheduledQuery = scheduledQuery.eq("brand_id", sp.brand);
    unscheduledQuery = unscheduledQuery.eq("brand_id", sp.brand);
  }
  if (sp.status) {
    scheduledQuery = scheduledQuery.eq("status", sp.status);
    unscheduledQuery = unscheduledQuery.eq("status", sp.status);
  }

  const [brandsResult, scheduledResult, unscheduledResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, color_hex")
      .order("name", { ascending: true }),
    scheduledQuery,
    unscheduledQuery,
  ]);

  const brands = (brandsResult.data ?? []) as Pick<
    Brand,
    "id" | "name" | "color_hex"
  >[];
  const scheduled = (scheduledResult.data ?? []) as PostWithRelations[];
  const unscheduled = (unscheduledResult.data ?? []) as PostWithRelations[];
  const loadError = scheduledResult.error ?? unscheduledResult.error;

  const byDate = new Map<string, PostWithRelations[]>();
  for (const post of scheduled) {
    if (!post.scheduled_date) continue;
    const list = byDate.get(post.scheduled_date) ?? [];
    list.push(post);
    byDate.set(post.scheduled_date, list);
  }

  const weeks = view === "month" ? monthGrid(anchor) : [weekDays(anchor)];
  const prevAnchor =
    view === "month" ? addMonths(anchor, -1) : addDays(anchor, -7);
  const nextAnchor =
    view === "month" ? addMonths(anchor, 1) : addDays(anchor, 7);

  const baseParams: SearchParams = {
    view,
    brand: sp.brand,
    status: sp.status,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900 capitalize">
            {view === "month" ? monthLabel(anchor) : weekLabel(anchor)}
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(baseParams, { date: toISODate(prevAnchor) })}
              className="btn-secondary px-2 py-1"
              aria-label="Période précédente"
            >
              ←
            </Link>
            <Link
              href={buildHref(baseParams, { date: toISODate(today) })}
              className="btn-secondary px-2 py-1 text-xs"
            >
              Aujourd&apos;hui
            </Link>
            <Link
              href={buildHref(baseParams, { date: toISODate(nextAnchor) })}
              className="btn-secondary px-2 py-1"
              aria-label="Période suivante"
            >
              →
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalendarFilters brands={brands} />
          <div className="flex overflow-hidden rounded-lg border border-slate-300">
            {(["month", "week"] as const).map((candidate) => (
              <Link
                key={candidate}
                href={buildHref(
                  { ...baseParams, view: candidate },
                  { date: toISODate(anchor) },
                )}
                className={`px-3 py-1.5 text-sm font-medium ${
                  view === candidate
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {candidate === "month" ? "Mois" : "Semaine"}
              </Link>
            ))}
          </div>
          <Link href="/sujets/auto" className="btn-secondary">
            Générer auto
          </Link>
          <Link href="/sujets/nouveau" className="btn-primary">
            Nouveau sujet
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Lecture impossible : {loadError.message}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-1.5 text-center text-xs font-semibold text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="divide-y divide-slate-200">
          {weeks.map((week) => (
            <div key={toISODate(week[0])} className="grid grid-cols-7">
              {week.map((day) => {
                const iso = toISODate(day);
                const dayPosts = byDate.get(iso) ?? [];
                const outside = view === "month" && !isSameMonth(day, anchor);
                return (
                  <div
                    key={iso}
                    className={`min-h-28 space-y-1 border-r border-slate-100 p-1.5 last:border-r-0 ${
                      outside ? "bg-slate-50/60" : "bg-white"
                    } ${view === "week" ? "min-h-64" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                          isSameDay(day, today)
                            ? "bg-indigo-600 text-white"
                            : outside
                              ? "text-slate-400"
                              : "text-slate-600"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {dayPosts.length}
                        </span>
                      )}
                    </div>
                    {dayPosts.map((post) => (
                      <PostChip key={post.id} post={post} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Posts non planifiés{" "}
          <span className="font-normal text-slate-400">
            ({unscheduled.length})
          </span>
        </h2>
        {unscheduled.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucun post en attente de date.{" "}
            <Link href="/sujets/nouveau" className="text-indigo-600 underline">
              Créer un sujet
            </Link>
          </p>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {unscheduled.map((post) => (
              <PostChip key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
