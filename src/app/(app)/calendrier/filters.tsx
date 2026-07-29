"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { STATUSES, STATUS_META } from "@/lib/platforms";
import type { Brand } from "@/lib/types";

type Props = {
  brands: Pick<Brand, "id" | "name" | "color_hex">[];
};

export function CalendarFilters({ brands }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/calendrier?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filtrer par marque"
        className="field w-auto py-1.5 text-sm"
        value={params.get("brand") ?? ""}
        onChange={(event) => update("brand", event.target.value)}
      >
        <option value="">Toutes les marques</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrer par statut"
        className="field w-auto py-1.5 text-sm"
        value={params.get("status") ?? ""}
        onChange={(event) => update("status", event.target.value)}
      >
        <option value="">Tous les statuts</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>
    </div>
  );
}
