"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";
import { createCliente } from "@/app/(app)/clientes/actions";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20";

export default function NuevoClienteModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[38px] items-center gap-2 rounded-[9px] bg-nexa-blue px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(11,108,255,0.28)] hover:bg-nexa-navy"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-nexa-border bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-nexa-navy">Nuevo cliente</h2>
            <form action={createCliente} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nombre" required placeholder="Razón social / nombre" className={`${inputClass} col-span-2`} />
                <input name="nombre_comercial" placeholder="Nombre comercial" className={`${inputClass} col-span-2`} />
                <select name="tipo_documento" defaultValue="RUC" className={inputClass}>
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                </select>
                <input name="numero_documento" required placeholder="Número de documento" className={inputClass} />
                <input name="distrito" placeholder="Distrito" className={inputClass} />
                <input name="direccion" placeholder="Dirección" className={inputClass} />
                <input name="contacto_nombre" placeholder="Contacto: nombre" className={inputClass} />
                <input name="contacto_cargo" placeholder="Contacto: cargo" className={inputClass} />
                <input name="contacto_telefono" placeholder="Contacto: teléfono" className={inputClass} />
                <input name="contacto_correo" type="email" placeholder="Contacto: correo" className={inputClass} />
                <select name="estado" defaultValue="piloto" className={inputClass}>
                  <option value="piloto">Piloto</option>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="cerrado">Cerrado</option>
                </select>
                <input
                  name="dia_cobro"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Día de cobro (opcional)"
                  className={inputClass}
                  title="Día del mes en que corresponde cobrarle. Déjalo vacío si no aplica (proyecto puntual)."
                />
                <textarea name="notas" placeholder="Notas" rows={2} className={`${inputClass} col-span-2`} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <SubmitButton variant="primary" pendingLabel="Creando..." className="rounded-md px-4 py-2 text-sm font-medium">
                  Crear cliente
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
