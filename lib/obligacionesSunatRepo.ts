// Escritura compartida de core_obligaciones_sunat, usada por los server
// actions del Panel (app/(app)/panel/actions.ts) y del módulo SUNAT
// (app/(app)/sunat/actions.ts) para no duplicar el parseo del formulario
// ni el upsert. Cada action decide a dónde redirigir después.
import type { createClient } from "@/lib/supabase/server";
import type { ObligacionSunatEstado, ObligacionSunatTipo } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface DatosObligacionSunat {
  periodo: string;
  tipo: ObligacionSunatTipo;
  estado: ObligacionSunatEstado;
  fecha_presentacion: string | null;
  fecha_pago: string | null;
  monto_igv: number | null;
  monto_renta: number | null;
  total_declarado: number | null;
  total_pagado: number | null;
  numero_orden: string | null;
  observaciones: string | null;
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Devuelve null si faltan los campos mínimos (periodo/tipo/estado).
export function parseObligacionSunatFormData(formData: FormData): DatosObligacionSunat | null {
  const periodo = str(formData, "periodo");
  const tipo = str(formData, "tipo") as ObligacionSunatTipo | null;
  const estado = str(formData, "estado") as ObligacionSunatEstado | null;
  if (!periodo || !tipo || !estado) return null;

  return {
    periodo,
    tipo,
    estado,
    fecha_presentacion: str(formData, "fecha_presentacion"),
    fecha_pago: str(formData, "fecha_pago"),
    monto_igv: num(formData, "monto_igv"),
    monto_renta: num(formData, "monto_renta"),
    total_declarado: num(formData, "total_declarado"),
    total_pagado: num(formData, "total_pagado"),
    numero_orden: str(formData, "numero_orden"),
    observaciones: str(formData, "observaciones"),
  };
}

// Registra a mano el estado de una obligación SUNAT (SIRE o FV621) para un
// período. Nexa Core no presenta ni paga nada por sí mismo: esto solo dice
// "ya lo hice directamente en SUNAT" — nunca se marca solo.
export async function upsertObligacionSunat(
  supabase: Supabase,
  datos: DatosObligacionSunat,
  userId: string | null,
) {
  return supabase
    .from("core_obligaciones_sunat")
    .upsert({ ...datos, created_by: userId }, { onConflict: "periodo,tipo" });
}
