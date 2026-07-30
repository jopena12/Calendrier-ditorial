import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion — Calendrier Éditorial KMI" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo size={44} className="mb-4" />
        <h1 className="text-xl font-semibold text-slate-900">
          Calendrier Éditorial KMI
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Outil interne — accès réservé.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
