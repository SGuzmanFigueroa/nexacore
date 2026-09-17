"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseObligacionSunatFormData, upsertObligacionSunat } from "@/lib/obligacionesSunatRepo";

// Registra a mano el estado de una obligación SUNAT (SIRE o FV621) para un
// período, desde la tarjeta de obligaciones del Panel. El historial
// completo por período vive en /sunat (app/(app)/sunat/actions.ts usa el
// mismo lib/obligacionesSunatRepo.ts) — este action solo cambia a dónde
// redirige después.
export async function actualizarObligacionSunat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const datos = parseObligacionSunatFormData(formData);
  if (!datos) {
    redirect(`/panel?error=${encodeURIComponent("Faltan datos de la obligación SUNAT.")}`);
  }

  const { error } = await upsertObligacionSunat(supabase, datos, user?.id ?? null);

  if (error) {
    redirect(`/panel?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/panel");
  revalidatePath("/sunat");
  redirect("/panel?message=" + encodeURIComponent("Estado de la obligación actualizado."));
}
