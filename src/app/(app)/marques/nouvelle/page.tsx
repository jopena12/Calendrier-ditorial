import Link from "next/link";
import { NewBrandForm } from "./new-brand-form";

export default function NewBrandPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/marques" className="text-sm text-slate-500 hover:underline">
        ← Marques
      </Link>
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Nouvelle marque
        </h1>
        <p className="text-sm text-slate-500">
          L&apos;onboarding (analyse du site + questionnaire) se fait à l&apos;étape
          suivante.
        </p>
      </div>
      <NewBrandForm />
    </div>
  );
}
