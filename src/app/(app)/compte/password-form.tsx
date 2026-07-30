"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";

const initialState: PasswordState = {};

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <h2 className="text-sm font-semibold text-slate-900">
        Changer le mot de passe
      </h2>

      <div>
        <label className="label" htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
        <p className="hint">10 caractères minimum.</p>
      </div>

      <div>
        <label className="label" htmlFor="confirmation">
          Confirmation
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="field"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel="Changement…">Changer</SubmitButton>
    </form>
  );
}
