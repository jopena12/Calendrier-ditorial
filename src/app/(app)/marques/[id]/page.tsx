import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteBrand } from "@/app/actions/brands";
import { BrandIdentityForm } from "./identity-form";
import { BrandOnboarding } from "./onboarding";
import type { Brand, BrandPlatform, Platform } from "@/lib/types";

// L'analyse de marque scrape le site puis appelle Claude : jusqu'à ~60 s.
export const maxDuration = 300;

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: brand }, { data: platforms }, { count: postCount }] =
    await Promise.all([
      supabase.from("brands").select("*").eq("id", id).single<Brand>(),
      supabase.from("brand_platforms").select("*").eq("brand_id", id),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", id),
    ]);

  if (!brand) notFound();

  const activePlatforms = ((platforms ?? []) as BrandPlatform[])
    .filter((row) => row.active)
    .map((row) => row.platform as Platform);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/marques"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Marques
        </Link>
        <Link
          href={`/sujets/nouveau?brand=${brand.id}`}
          className="btn-secondary"
        >
          Créer un sujet pour cette marque
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">{brand.name}</h1>
        <p className="text-sm text-slate-500">
          {postCount ?? 0} post{(postCount ?? 0) > 1 ? "s" : ""} généré
          {(postCount ?? 0) > 1 ? "s" : ""} pour cette marque.
        </p>
      </div>

      <BrandIdentityForm brand={brand} activePlatforms={activePlatforms} />

      <BrandOnboarding brand={brand} />

      <section className="card border-red-200 p-5">
        <h2 className="text-sm font-semibold text-red-700">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-slate-600">
          Supprimer la marque efface aussi ses sujets et tous ses posts.
        </p>
        <form action={deleteBrand} className="mt-3">
          <input type="hidden" name="brand_id" value={brand.id} />
          <button type="submit" className="btn-danger">
            Supprimer « {brand.name} »
          </button>
        </form>
      </section>
    </div>
  );
}
