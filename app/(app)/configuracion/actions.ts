"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RegimenRenta } from "@/lib/types";

export async function updateRegimen(formData: FormData) {
  const supabase = await createClient();
  const regimen = String(formData.get("regimen_renta")) as RegimenRenta;

  const { error } = await supabase
    .from("core_configuracion")
    .update({ regimen_renta: regimen })
    .eq("id", true);

  if (error) {
    redirect(`/configuracion?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/configuracion");
  revalidatePath("/panel");
  redirect("/configuracion?message=" + encodeURIComponent("Régimen actualizado."));
}
