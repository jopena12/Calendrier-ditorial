import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/calendrier" className="font-semibold text-slate-900">
            Calendrier Éditorial <span className="text-indigo-600">KMI</span>
          </Link>
          <Nav />
          <form action={signOut} className="ml-auto">
            <button type="submit" className="btn-ghost text-xs">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
