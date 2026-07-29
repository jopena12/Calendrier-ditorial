import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/env";

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 * `cookies()` est asynchrone depuis Next 16.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabasePublicConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component : le rafraîchissement de session
          // est déjà géré par le proxy, on peut ignorer.
        }
      },
    },
  });
}

/** Renvoie l'utilisateur connecté, ou null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
