import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const user = await getUser();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href="/calendrier"
        className="text-sm text-slate-500 hover:underline"
      >
        ← Calendrier
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">Compte</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <PasswordForm />
    </div>
  );
}
