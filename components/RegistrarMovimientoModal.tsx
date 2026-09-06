"use client";

import { useMemo, useState } from "react";
import SubmitButton from "./SubmitButton";
import AdjuntoInput from "./AdjuntoInput";
import { createComprobante } from "@/app/(app)/ingresos/actions";
import { createGasto } from "@/app/(app)/gastos/actions";
import {
  COMPROBANTE_TIPO_LABELS,
  GASTO_CATEGORIAS,
  GASTO_CATEGORIA_LABELS,
  GASTO_FRECUENCIA_LABELS,
  MEDIO_PAGO_LABELS,
  type ComprobanteTipo,
  type MedioPago,
} from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20";
const labelClass = "text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted";

const COMPROBANTE_TIPOS = Object.keys(COMPROBANTE_TIPO_LABELS) as ComprobanteTipo[];
const MEDIOS_PAGO = Object.keys(MEDIO_PAGO_LABELS) as MedioPago[];
const HOY = new Date().toISOString().slice(0, 10);

export default function RegistrarMovimientoModal({
  clientes,
}: {
  clientes: { id: string; nombre: string; nombre_comercial: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"ingreso" | "gasto">("ingreso");
  const [subtotal, setSubtotal] = useState(0);
  const [afectoIgv, setAfectoIgv] = useState(true);
  const [montoGasto, setMontoGasto] = useState(0);
  const [creditoFiscal, setCreditoFiscal] = useState(false);

  const igv = useMemo(() => (afectoIgv ? Math.round(subtotal * 0.18 * 100) / 100 : 0), [
    subtotal,
    afectoIgv,
  ]);
  const total = Math.round((subtotal + igv) * 100) / 100;

  const igvGasto = useMemo(
    () => (creditoFiscal ? Math.round(((montoGasto * 0.18) / 1.18) * 100) / 100 : 0),
    [montoGasto, creditoFiscal],
  );

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
        Registrar movimiento
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-nexa-navy">Registrar movimiento</h2>
              <div className="flex rounded-[9px] border border-nexa-border p-0.5">
                <button
                  type="button"
                  onClick={() => setTipoMovimiento("ingreso")}
                  className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                    tipoMovimiento === "ingreso" ? "bg-nexa-blue text-white" : "text-nexa-topbar-muted"
                  }`}
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimiento("gasto")}
                  className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                    tipoMovimiento === "gasto" ? "bg-nexa-navy text-white" : "text-nexa-topbar-muted"
                  }`}
                >
                  Gasto
                </button>
              </div>
            </div>

            {tipoMovimiento === "ingreso" ? (
              <form action={createComprobante} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select name="cliente_id" required className={`${inputClass} col-span-2`} defaultValue="">
                    <option value="" disabled>
                      Selecciona un cliente
                    </option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre_comercial || c.nombre}
                      </option>
                    ))}
                  </select>
                  <input name="concepto" placeholder="Concepto" className={`${inputClass} col-span-2`} />
                  <select name="tipo" defaultValue="factura" className={inputClass}>
                    {COMPROBANTE_TIPOS.map((t) => (
                      <option key={t} value={t}>
                        {COMPROBANTE_TIPO_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input name="serie_numero" placeholder="Serie-número (ej. F001-7)" className={inputClass} />
                  <div>
                    <label className={labelClass}>Fecha emisión</label>
                    <input name="fecha_emision" type="date" defaultValue={HOY} required className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha vencimiento</label>
                    <input name="fecha_vencimiento" type="date" className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className={labelClass}>Subtotal (S/)</label>
                    <input
                      name="subtotal"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className={`${inputClass} mt-1`}
                      onChange={(e) => setSubtotal(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-2">
                    <input
                      id="afecto_igv"
                      name="afecto_igv"
                      type="checkbox"
                      defaultChecked
                      onChange={(e) => setAfectoIgv(e.target.checked)}
                    />
                    <label htmlFor="afecto_igv" className="text-sm text-nexa-topbar-text">
                      Afecto a IGV (18%)
                    </label>
                  </div>
                  <select name="medio_pago" defaultValue="" className={inputClass}>
                    <option value="">Medio de pago (al cobrar)</option>
                    {MEDIOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {MEDIO_PAGO_LABELS[m]}
                      </option>
                    ))}
                  </select>
                  <AdjuntoInput />
                  <textarea name="notas" placeholder="Notas" rows={2} className={`${inputClass} col-span-2`} />
                </div>

                <div className="flex items-center justify-between rounded-[9px] bg-nexa-app-bg px-4 py-3">
                  <span className="text-[12px] font-semibold text-nexa-topbar-muted">
                    IGV: S/ {igv.toFixed(2)}
                  </span>
                  <span className="num text-base font-bold text-nexa-navy">Total: S/ {total.toFixed(2)}</span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
                    Registrar ingreso
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <form action={createGasto} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Fecha</label>
                    <input name="fecha" type="date" defaultValue={HOY} required className={`${inputClass} mt-1`} />
                  </div>
                  <div>
                    <label className={labelClass}>Monto total (S/)</label>
                    <input
                      name="monto"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className={`${inputClass} mt-1`}
                      onChange={(e) => setMontoGasto(Number(e.target.value) || 0)}
                    />
                  </div>
                  <input name="concepto" required placeholder="Concepto" className={`${inputClass} col-span-2`} />
                  <input name="proveedor" placeholder="Proveedor" className={`${inputClass} col-span-2`} />
                  <select name="categoria" defaultValue="otros" className={inputClass}>
                    {GASTO_CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {GASTO_CATEGORIA_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                  <select name="frecuencia" defaultValue="unico" className={inputClass}>
                    {Object.entries(GASTO_FRECUENCIA_LABELS).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select name="medio_pago" defaultValue="" className={inputClass}>
                    <option value="">Medio de pago</option>
                    {MEDIOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {MEDIO_PAGO_LABELS[m]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="credito_fiscal"
                      name="credito_fiscal"
                      type="checkbox"
                      onChange={(e) => setCreditoFiscal(e.target.checked)}
                    />
                    <label htmlFor="credito_fiscal" className="text-sm text-nexa-topbar-text">
                      Con factura (IGV con crédito fiscal)
                    </label>
                  </div>
                  <AdjuntoInput />
                  <textarea name="notas" placeholder="Notas" rows={2} className={`${inputClass} col-span-2`} />
                </div>

                {creditoFiscal && (
                  <div className="flex items-center justify-between rounded-[9px] bg-nexa-app-bg px-4 py-3">
                    <span className="text-[12px] font-semibold text-nexa-topbar-muted">
                      IGV incluido en el monto (crédito fiscal)
                    </span>
                    <span className="num text-base font-bold text-nexa-navy">S/ {igvGasto.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <SubmitButton variant="dark" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
                    Registrar gasto
                  </SubmitButton>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
