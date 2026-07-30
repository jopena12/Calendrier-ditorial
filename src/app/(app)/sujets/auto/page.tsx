import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/date";
import { AutoPlanner } from "./auto-planner";
import type { Brand } from "@/lib/types";

// Proposition de sujets puis un appel Claude par réseau et par sujet retenu :
// le lot complet peut prendre plusieurs minutes.
export const maxDuration = 800;

export default async function AutoTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, color_hex, brand_profile")
    .order("name", { ascending: true });

  const brandList = (brands ?? []) as Array<
    Pick<Brand, "id" | "name" | "color_hex" | "brand_profile">
  >;
  const ready = brandList.filter((brand) => brand.brand_profile?.trim());

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/calendrier"
        className="text-sm text-slate-500 hover:underline"
      >
        ← Calendrier
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Générer automatiquement
        </h1>
        <p className="text-sm text-slate-500">
          Claude propose des sujets à partir de la fiche de la marque, en
          excluant ceux déjà traités. Tu gardes ceux qui te plaisent, il rédige
          les posts.
        </p>
      </div>

      {ready.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            Aucune marque n&apos;a de fiche de connaissance. Le mode automatique
            s&apos;appuie dessus pour trouver des sujets ancrés dans le réel —
            fais d&apos;abord l&apos;onboarding d&apos;une marque.
          </p>
          <Link href="/marques" className="btn-primary mt-4">
            Voir les marques
          </Link>
        </div>
      ) : (
        <AutoPlanner
          brands={ready}
          defaultBrandId={sp.brand}
          today={toISODate(new Date())}
          incompleteBrands={brandList.length - ready.length}
        />
      )}
    </div>
  );
}
