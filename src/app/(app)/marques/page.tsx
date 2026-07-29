import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_META } from "@/lib/platforms";
import { BrandDot, PlatformBadge } from "@/components/badges";
import type { Brand, BrandPlatform } from "@/lib/types";

export default async function BrandsPage() {
  const supabase = await createClient();

  const [{ data: brands, error }, { data: platforms }] = await Promise.all([
    supabase.from("brands").select("*").order("name", { ascending: true }),
    supabase.from("brand_platforms").select("*").eq("active", true),
  ]);

  const byBrand = new Map<string, BrandPlatform[]>();
  for (const row of (platforms ?? []) as BrandPlatform[]) {
    const list = byBrand.get(row.brand_id) ?? [];
    list.push(row);
    byBrand.set(row.brand_id, list);
  }

  const list = (brands ?? []) as Brand[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Marques</h1>
          <p className="text-sm text-slate-500">
            Chaque marque a sa fiche de connaissance, réutilisée pour tous ses
            posts.
          </p>
        </div>
        <Link href="/marques/nouvelle" className="btn-primary">
          Ajouter une marque
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Lecture impossible : {error.message}
        </p>
      )}

      {list.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            Aucune marque enregistrée. Commence par en créer une, puis lance son
            onboarding.
          </p>
          <Link href="/marques/nouvelle" className="btn-primary mt-4">
            Ajouter une marque
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((brand) => {
            const activePlatforms = (byBrand.get(brand.id) ?? []).sort((a, b) =>
              PLATFORM_META[a.platform].label.localeCompare(
                PLATFORM_META[b.platform].label,
              ),
            );
            const ready = Boolean(brand.brand_profile?.trim());

            return (
              <Link
                key={brand.id}
                href={`/marques/${brand.id}`}
                className="card block p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <BrandDot color={brand.color_hex} />
                  <h2 className="font-medium text-slate-900">{brand.name}</h2>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                      ready
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {ready ? "Fiche prête" : "Onboarding à faire"}
                  </span>
                </div>

                {brand.website_url && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {brand.website_url}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  {activePlatforms.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Aucun réseau actif
                    </span>
                  ) : (
                    activePlatforms.map((row) => (
                      <PlatformBadge
                        key={row.id}
                        platform={row.platform}
                        size="xs"
                      />
                    ))
                  )}
                </div>

                {brand.brand_profile && (
                  <p className="mt-3 line-clamp-3 text-xs text-slate-500">
                    {brand.brand_profile.replace(/[#*_`]/g, "").slice(0, 200)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
