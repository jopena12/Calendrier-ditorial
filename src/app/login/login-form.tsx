"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton className="btn-primary w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </form>
  );
}
