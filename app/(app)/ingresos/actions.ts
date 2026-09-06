"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ComprobanteTipo, MedioPago } from "@/lib/types";

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

export async function createComprobante(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const subtotal = num(formData, "subtotal");
  const afectoIgv = formData.get("afecto_igv") === "on";
  const igv = afectoIgv ? Math.round(subtotal * 0.18 * 100) / 100 : 0;
  const total = Math.round((subtotal + igv) * 100) / 100;

  const { error } = await supabase.from("core_comprobantes").insert({
    cliente_id: str(formData, "cliente_id"),
    servicio_id: str(formData, "servicio_id"),
    concepto: str(formData, "concepto"),
    tipo: str(formData, "tipo") as ComprobanteTipo,
    serie_numero: str(formData, "serie_numero"),
    fecha_emision: str(formData, "fecha_emision"),
    fecha_vencimiento: str(formData, "fecha_vencimiento"),
    subtotal,
    afecto_igv: afectoIgv,
    igv,
    total,
    medio_pago: str(formData, "medio_pago") as MedioPago | null,
    url_adjunto: str(formData, "url_adjunto"),
    notas: str(formData, "notas"),
    created_by: user?.id ?? null,
  });

  if (error) {
    redirect(`/ingresos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ingresos");
  revalidatePath("/clientes");
  redirect("/ingresos?message=" + encodeURIComponent("Comprobante registrado."));
}

export async function marcarCobrado(id: string, formData: FormData) {
  const supabase = await createClient();
  const medioPago = str(formData, "medio_pago") as MedioPago | null;

  const { error } = await supabase
    .from("core_comprobantes")
    .update({
      estado_pago: "cobrado",
      medio_pago: medioPago,
      fecha_cobro: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);

  if (error) {
    redirect(`/ingresos?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/ingresos");
  revalidatePath("/clientes");
}

export async function anularComprobante(id: string) {
  const supabase = await createClient();
  await supabase.from("core_comprobantes").update({ estado_pago: "anulado" }).eq("id", id);
  revalidatePath("/ingresos");
  revalidatePath("/clientes");
}
