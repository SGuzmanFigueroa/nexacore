"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseObligacionSunatFormData, upsertObligacionSunat } from "@/lib/obligacionesSunatRepo";

// Mismo registro manual de estado que app/(app)/panel/actions.ts (comparten
// lib/obligacionesSunatRepo.ts) — la única diferencia es que este redirige
// de vuelta al detalle del período en /sunat en vez de al Panel.
export async function actualizarObligacionSunat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const datos = parseObligacionSunatFormData(formData);
  const volverA = datos ? `/sunat/${datos.periodo.replace("-", "/")}` : "/sunat";

  if (!datos) {
    redirect(`${volverA}?error=${encodeURIComponent("Faltan datos de la obligación SUNAT.")}`);
  }

  const { error } = await upsertObligacionSunat(supabase, datos, user?.id ?? null);

  if (error) {
    redirect(`${volverA}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/sunat");
  revalidatePath(volverA);
  revalidatePath("/panel");
  redirect(`${volverA}?message=${encodeURIComponent("Estado de la obligación actualizado.")}`);
}
