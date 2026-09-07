import "server-only";
import { createClient } from "@supabase/supabase-js";

// Usa la service_role key: salta RLS. Solo se importa desde contextos de
// servidor sin sesion de usuario (la funcion programada de recordatorios).
// Nunca exponer SUPABASE_SERVICE_ROLE_KEY con prefijo NEXT_PUBLIC_.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
