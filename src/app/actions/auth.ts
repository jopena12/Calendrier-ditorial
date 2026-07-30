"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Identifiants invalides." };
  }

  revalidatePath("/", "layout");
  redirect("/calendrier");
}

export type PasswordState = { error?: string; message?: string };

const MIN_PASSWORD_LENGTH = 10;

/** Changement de mot de passe par l'utilisateur connecté. */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }
  if (password !== confirmation) {
    return { error: "Les deux saisies ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: `Changement impossible : ${error.message}` };
  }

  return {
    message:
      "Mot de passe changé. Il sera demandé à la prochaine connexion — pense à le mettre à jour dans ton gestionnaire de mots de passe.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
