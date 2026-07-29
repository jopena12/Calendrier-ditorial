import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewTopicForm } from "./new-topic-form";
import type { Brand, BrandPlatform, Platform } from "@/lib/types";

// La génération lance un appel Claude par réseau coché : jusqu'à ~90 s.
// Sans ça, l'hébergeur coupe la Server Action (10 s par défaut sur Vercel Hobby).
export const maxDuration = 300;

export default async function NewTopicPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: brands }, { data: platforms }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, color_hex, brand_profile")
      .order("name", { ascending: true }),
    supabase.from("brand_platforms").select("*").eq("active", true),
  ]);

  const brandList = (brands ?? []) as Array<
    Pick<Brand, "id" | "name" | "color_hex" | "brand_profile">
  >;

  const activeByBrand: Record<string, Platform[]> = {};
  for (const row of (platforms ?? []) as BrandPlatform[]) {
    activeByBrand[row.brand_id] = [
      ...(activeByBrand[row.brand_id] ?? []),
      row.platform,
    ];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/calendrier"
        className="text-sm text-slate-500 hover:underline"
      >
        ← Calendrier
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Nouveau sujet</h1>
        <p className="text-sm text-slate-500">
          Un sujet = un brief, décliné en un post par réseau coché.
        </p>
      </div>

      {brandList.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            Crée d&apos;abord une marque : la fiche de connaissance est le socle
            de la génération.
          </p>
          <Link href="/marques/nouvelle" className="btn-primary mt-4">
            Ajouter une marque
          </Link>
        </div>
      ) : (
        <NewTopicForm
          brands={brandList}
          activeByBrand={activeByBrand}
          defaultBrandId={sp.brand}
          defaultDate={sp.date}
        />
      )}
    </div>
  );
}
