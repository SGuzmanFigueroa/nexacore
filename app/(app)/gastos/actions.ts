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

  const { error } = await supabase.from("core_gastos").insert({
    fecha: str(formData, "fecha") ?? new Date().toISOString().slice(0, 10),
    concepto: str(formData, "concepto"),
    proveedor: str(formData, "proveedor"),
    categoria: str(formData, "categoria") as GastoCategoria,
    frecuencia: (str(formData, "frecuencia") ?? "unico") as GastoFrecuencia,
    monto: num(formData, "monto"),
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

// No hay acción de anular/eliminar gasto todavía: core_gastos no tiene un
// campo de estado (a diferencia de core_clientes/core_comprobantes), y la
// regla de "nada de borrado físico" aplica también aquí. Se agrega una
// columna `anulado` en la migración de la Fase 4 junto con el resto de
// cambios de esquema pendientes.
