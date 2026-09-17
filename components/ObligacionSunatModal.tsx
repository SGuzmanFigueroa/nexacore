"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";
import {
  OBLIGACION_ESTADO_LABELS,
  OBLIGACION_ESTADOS_POR_TIPO,
  OBLIGACION_SUNAT_TIPO_LABELS,
  type ObligacionSunat,
  type ObligacionSunatTipo,
} from "@/lib/types";
import { formatFecha } from "@/lib/format";
import { classifyPeriod } from "@/lib/taxService";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20";

export default function ObligacionSunatModal({
  tipo,
  periodo,
  periodoLabel,
  fechaLimite,
  registro,
  action,
}: {
  tipo: ObligacionSunatTipo;
  periodo: string;
  periodoLabel: string;
  fechaLimite: string | null;
  registro: ObligacionSunat | null;
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  // El período todavía no cerró (en curso) o ni siquiera empezó (futuro):
  // se puede seguir usando el formulario, pero exige una confirmación
  // explícita antes de dejar guardar, para no marcar por error algo como
  // presentado/declarado/pagado antes de que exista esa obligación.
  const [confirmaAdelantado, setConfirmaAdelantado] = useState(false);
  const clasificacion = classifyPeriod(periodo, new Date());
  const requiereConfirmacion = clasificacion !== "pasado";
  const estados = OBLIGACION_ESTADOS_POR_TIPO[tipo];
  const yaCumplida = !!registro && registro.estado !== "pendiente";
  const textoBoton = yaCumplida
    ? "Editar estado"
    : tipo === "sire"
      ? "Marcar como presentado"
      : "Actualizar estado";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-nexa-blue hover:underline"
      >
        {textoBoton}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[14px] border border-nexa-border bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-nexa-navy">
              {OBLIGACION_SUNAT_TIPO_LABELS[tipo]} — {periodoLabel}
            </h2>
            {fechaLimite && (
              <p className="mt-1 text-[12.5px] text-nexa-topbar-muted">Vence {formatFecha(fechaLimite)}</p>
            )}

            {requiereConfirmacion && (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                {clasificacion === "futuro"
                  ? "Este período todavía no comienza — no debería existir una obligación que marcar."
                  : "Este período sigue en curso: la obligación real recién vence el mes siguiente."}{" "}
                Márcalo solo si ya lo presentaste/declaraste adelantado en SUNAT.
              </div>
            )}

            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="periodo" value={periodo} />
              <input type="hidden" name="tipo" value={tipo} />

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Estado</label>
                <select
                  name="estado"
                  defaultValue={registro?.estado ?? "pendiente"}
                  className={`${inputClass} mt-1`}
                >
                  {estados.map((e) => (
                    <option key={e} value={e}>
                      {OBLIGACION_ESTADO_LABELS[e]}
                    </option>
                  ))}
                </select>
              </div>

              {tipo === "sire" ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500">Fecha de presentación</label>
                  <input
                    type="date"
                    name="fecha_presentacion"
                    defaultValue={registro?.fecha_presentacion ?? ""}
                    className={`${inputClass} mt-1`}
                  />
                </div>
              ) : (
                <>
                  {/* Declarado y pagado son hechos distintos: un FV621 puede
                      estar declarado sin estar pagado todavía, así que van
                      en secciones separadas con sus propias fechas/montos. */}
                  <fieldset className="rounded-md border border-slate-200 p-3">
                    <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-nexa-blue">
                      Declarado en SUNAT
                    </legend>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Fecha de declaración</label>
                        <input
                          type="date"
                          name="fecha_presentacion"
                          defaultValue={registro?.fecha_presentacion ?? ""}
                          className={`${inputClass} mt-1`}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">IGV declarado</label>
                          <input
                            type="number"
                            step="0.01"
                            name="monto_igv"
                            defaultValue={registro?.monto_igv ?? ""}
                            className={`${inputClass} mt-1`}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Renta declarada</label>
                          <input
                            type="number"
                            step="0.01"
                            name="monto_renta"
                            defaultValue={registro?.monto_renta ?? ""}
                            className={`${inputClass} mt-1`}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Total declarado</label>
                          <input
                            type="number"
                            step="0.01"
                            name="total_declarado"
                            defaultValue={registro?.total_declarado ?? ""}
                            className={`${inputClass} mt-1`}
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="rounded-md border border-slate-200 p-3">
                    <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-nexa-blue">
                      Pago SUNAT
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Fecha de pago</label>
                        <input
                          type="date"
                          name="fecha_pago"
                          defaultValue={registro?.fecha_pago ?? ""}
                          className={`${inputClass} mt-1`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500">Total pagado</label>
                        <input
                          type="number"
                          step="0.01"
                          name="total_pagado"
                          defaultValue={registro?.total_pagado ?? ""}
                          className={`${inputClass} mt-1`}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-nexa-topbar-muted">
                      Déjalo vacío si ya declaraste pero todavía no pagaste.
                    </p>
                  </fieldset>
                </>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-500">
                  N.º de orden SUNAT (opcional)
                </label>
                <input
                  name="numero_orden"
                  defaultValue={registro?.numero_orden ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500">Observaciones</label>
                <textarea
                  name="observaciones"
                  rows={2}
                  defaultValue={registro?.observaciones ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>

              {requiereConfirmacion && (
                <label className="flex items-start gap-2 text-[12px] text-nexa-topbar-text">
                  <input
                    type="checkbox"
                    checked={confirmaAdelantado}
                    onChange={(e) => setConfirmaAdelantado(e.target.checked)}
                    className="mt-0.5"
                  />
                  Confirmo que quiero registrar este estado antes de que venza el período.
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <SubmitButton
                  variant="primary"
                  pendingLabel="Guardando..."
                  disabled={requiereConfirmacion && !confirmaAdelantado}
                  className="rounded-md px-4 py-2 text-sm font-medium"
                >
                  Guardar
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
