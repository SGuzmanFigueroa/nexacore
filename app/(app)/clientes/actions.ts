"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fechaADiaCobro } from "@/lib/cobranza";
import type { ClienteEstado, TipoDocumento } from "@/lib/types";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createCliente(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("core_clientes")
    .insert({
      nombre: str(formData, "nombre"),
      nombre_comercial: str(formData, "nombre_comercial"),
      tipo_documento: str(formData, "tipo_documento") as TipoDocumento,
      numero_documento: str(formData, "numero_documento"),
      distrito: str(formData, "distrito"),
      direccion: str(formData, "direccion"),
      contacto_nombre: str(formData, "contacto_nombre"),
      contacto_cargo: str(formData, "contacto_cargo"),
      contacto_telefono: str(formData, "contacto_telefono"),
      contacto_correo: str(formData, "contacto_correo"),
      estado: (str(formData, "estado") ?? "piloto") as ClienteEstado,
      notas: str(formData, "notas"),
      dia_cobro: fechaADiaCobro(str(formData, "dia_cobro")),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/clientes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCliente(clienteId: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("core_clientes")
    .update({
      nombre: str(formData, "nombre"),
      nombre_comercial: str(formData, "nombre_comercial"),
      tipo_documento: str(formData, "tipo_documento") as TipoDocumento,
      numero_documento: str(formData, "numero_documento"),
      distrito: str(formData, "distrito"),
      direccion: str(formData, "direccion"),
      contacto_nombre: str(formData, "contacto_nombre"),
      contacto_cargo: str(formData, "contacto_cargo"),
      contacto_telefono: str(formData, "contacto_telefono"),
      contacto_correo: str(formData, "contacto_correo"),
      estado: str(formData, "estado") as ClienteEstado,
      notas: str(formData, "notas"),
      dia_cobro: fechaADiaCobro(str(formData, "dia_cobro")),
    })
    .eq("id", clienteId);

  if (error) {
    redirect(`/clientes/${clienteId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}?message=${encodeURIComponent("Cambios guardados.")}`);
}

export async function addNotaCliente(clienteId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nota = str(formData, "nota");
  if (nota) {
    await supabase.from("core_notas_cliente").insert({
      cliente_id: clienteId,
      nota,
      created_by: user?.id ?? null,
    });
  }

  revalidatePath(`/clientes/${clienteId}`);
}
