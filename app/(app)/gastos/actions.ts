"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GastoCategoria, GastoFrecuencia, MedioPago } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) ? v : 0;
}

export async function createGasto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const monto = num(formData, "monto");
  const creditoFiscal = formData.get("credito_fiscal") === "on";
  // El IGV se extrae de un monto que ya incluye IGV (monto = total pagado).
  const igv = creditoFiscal ? Math.round(((monto * 0.18) / 1.18) * 100) / 100 : 0;

  const { error } = await supabase.from("core_gastos").insert({
    fecha: str(formData, "fecha") ?? new Date().toISOString().slice(0, 10),
    concepto: str(formData, "concepto"),
    proveedor: str(formData, "proveedor"),
    categoria: str(formData, "categoria") as GastoCategoria,
    frecuencia: (str(formData, "frecuencia") ?? "unico") as GastoFrecuencia,
    monto,
    igv,
    credito_fiscal: creditoFiscal,
    medio_pago: str(formData, "medio_pago") as MedioPago | null,
    url_adjunto: str(formData, "url_adjunto"),
    notas: str(formData, "notas"),
    created_by: user?.id ?? null,
  });

  if (error) {
    redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/gastos");
  revalidatePath("/panel");
  redirect("/gastos?message=" + encodeURIComponent("Gasto registrado."));
}

export async function anularGasto(id: string) {
  const supabase = await createClient();
  await supabase.from("core_gastos").update({ anulado: true }).eq("id", id);
  revalidatePath("/gastos");
  revalidatePath("/panel");
}
