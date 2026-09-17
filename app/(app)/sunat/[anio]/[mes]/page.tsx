import Link from "next/link";
import { notFound } from "next/navigation";
import Topbar from "@/components/Topbar";
import ObligacionSunatModal from "@/components/ObligacionSunatModal";
import EstadoObligacionBadge from "@/components/EstadoObligacionBadge";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import {
  OBLIGACION_ESTADO_LABELS,
  REGIMEN_RENTA_LABELS,
  type Comprobante,
  type Configuracion,
  type Gasto,
  type ObligacionSunat,
} from "@/lib/types";
import { getSunatDeadline, nombrePeriodo, tieneCronograma } from "@/lib/sunatCalendar";
import { buildEstimadoPeriodo, classifyPeriod, compareEstimadoVsDeclarado, getTaxPeriod } from "@/lib/taxService";
import { actualizarObligacionSunat } from "../../actions";

function periodoAdyacente(periodo: string, delta: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SunatDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ anio: string; mes: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { anio, mes } = await params;
  const { error, message } = await searchParams;

  if (!/^\d{4}$/.test(anio) || !/^(0[1-9]|1[0-2])$/.test(mes)) {
    notFound();
  }
  const periodo = `${anio}-${mes}`;

  const supabase = await createClient();
  const hoy = new Date();
  const finDeMes = new Date(Number(anio), Number(mes), 0).toISOString().slice(0, 10);

  const [{ data: configRaw }, { data: comprobantesRaw }, { data: gastosRaw }, { data: obligacionesRaw }] =
    await Promise.all([
      supabase.from("core_configuracion").select("*").eq("id", true).single(),
      supabase
        .from("core_comprobantes")
        .select("fecha_emision, subtotal, igv, total, estado_pago")
        .gte("fecha_emision", `${periodo}-01`)
        .lte("fecha_emision", finDeMes),
      supabase
        .from("core_gastos")
        .select("fecha, igv, credito_fiscal, anulado")
        .gte("fecha", `${periodo}-01`)
        .lte("fecha", finDeMes),
      supabase.from("core_obligaciones_sunat").select("*").eq("periodo", periodo),
    ]);

  const config = configRaw as Configuracion;
  const comprobantes = (comprobantesRaw ?? []) as Pick<
    Comprobante,
    "fecha_emision" | "subtotal" | "igv" | "total" | "estado_pago"
  >[];
  const gastos = ((gastosRaw ?? []) as Pick<Gasto, "fecha" | "igv" | "credito_fiscal" | "anulado">[]).filter(
    (g) => !g.anulado,
  );
  const obligaciones = (obligacionesRaw ?? []) as ObligacionSunat[];
  const obligacionSire = obligaciones.find((o) => o.tipo === "sire") ?? null;
  const obligacionFv621 = obligaciones.find((o) => o.tipo === "fv621") ?? null;

  const comprobantesPeriodo = comprobantes.filter(
    (c) => getTaxPeriod(c.fecha_emision) === periodo && c.estado_pago !== "anulado",
  );
  const gastosPeriodo = gastos.filter((g) => getTaxPeriod(g.fecha) === periodo);
  const estimado = buildEstimadoPeriodo(comprobantesPeriodo, gastosPeriodo, config.regimen_renta);

  const clasificacion = classifyPeriod(periodo, hoy);
  const fechaSire = getSunatDeadline(periodo, config.ruc, "sire");
  const fechaFv621 = getSunatDeadline(periodo, config.ruc, "fv621");

  const comparacion = compareEstimadoVsDeclarado(
    { igv: estimado.igvPorPagar, renta: estimado.pagoACuentaRenta },
    {
      igv: obligacionFv621?.monto_igv ?? null,
      renta: obligacionFv621?.monto_renta ?? null,
      total: obligacionFv621?.total_declarado ?? null,
    },
  );

  const periodoAnterior = periodoAdyacente(periodo, -1);
  const periodoSiguiente = periodoAdyacente(periodo, 1);

  return (
    <>
      <Topbar
        title={nombrePeriodo(periodo)}
        subtitle={`${config.razon_social} — RUC ${config.ruc} · ${REGIMEN_RENTA_LABELS[config.regimen_renta]}`}
      />

      <div className="space-y-6 p-7">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link href={`/sunat?anio=${anio}`} className="text-[12.5px] font-semibold text-nexa-blue hover:underline">
            ← Volver al historial {anio}
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] font-semibold">
            <Link href={`/sunat/${periodoAnterior.replace("-", "/")}`} className="text-nexa-blue hover:underline">
              ← {nombrePeriodo(periodoAnterior)}
            </Link>
            <Link href={`/sunat/${periodoSiguiente.replace("-", "/")}`} className="text-nexa-blue hover:underline">
              {nombrePeriodo(periodoSiguiente)} →
            </Link>
          </div>
        </div>

        {(error || message) && (
          <div className={`rounded-md px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-nexa-light text-nexa-blue"}`}>
            {error || message}
          </div>
        )}

        {!tieneCronograma(anio) && (
          <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Calendario SUNAT aún no configurado para el año {anio}. No se muestran fechas de vencimiento SIRE/FV621
            hasta que SUNAT lo publique y se cargue en Nexa Core.
          </div>
        )}

        {/* RESUMEN ESTIMADO */}
        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Resumen estimado</p>
            {clasificacion === "en_curso" && (
              <span className="rounded-full bg-nexa-light px-2.5 py-1 text-[11px] font-bold text-nexa-blue">
                En curso
              </span>
            )}
            {clasificacion === "futuro" && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                Futuro
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Ventas gravadas</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">{formatSoles(estimado.ventasFacturadas)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Base imponible</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">{formatSoles(estimado.baseImponible)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV ventas</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">{formatSoles(estimado.igvVentas)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Crédito fiscal</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">{formatSoles(estimado.creditoFiscal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV estimado por pagar</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">
                {formatSoles(estimado.igvPorPagar)}
                {estimado.saldoFavor > 0 && (
                  <span className="ml-1 text-[11px] font-semibold text-nexa-positive">
                    ({formatSoles(estimado.saldoFavor)} a favor)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Pago a cuenta Renta</p>
              <p className="num mt-1 text-base font-bold text-nexa-navy">{formatSoles(estimado.pagoACuentaRenta)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Total estimado</p>
              <p className="num mt-1 text-base font-bold text-nexa-alert">{formatSoles(estimado.reservaTributaria)}</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-nexa-topbar-muted">
            Estimación informativa basada en los movimientos registrados en Nexa Core. El importe definitivo debe
            verificarse en SUNAT y no reemplaza la declaración tributaria ni el criterio de un contador.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* SIRE */}
          <div className="rounded-[14px] border border-nexa-border bg-white p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Registros SIRE</p>
              <EstadoObligacionBadge
                clasificacion={clasificacion}
                fechaLimite={fechaSire}
                hoy={hoy}
                registro={obligacionSire}
              />
            </div>
            <p className="text-[13px] text-nexa-topbar-text">
              Fecha de vencimiento:{" "}
              <span className="font-semibold text-nexa-navy">
                {fechaSire ? formatFecha(fechaSire) : "Sin cronograma"}
              </span>
            </p>
            {obligacionSire && obligacionSire.estado !== "pendiente" && (
              <div className="mt-2 space-y-1 text-[13px] text-nexa-topbar-text">
                <p>
                  Estado: <span className="font-semibold text-nexa-navy">{OBLIGACION_ESTADO_LABELS[obligacionSire.estado]}</span>
                </p>
                {obligacionSire.fecha_presentacion && (
                  <p>
                    Fecha de presentación:{" "}
                    <span className="font-semibold text-nexa-navy">{formatFecha(obligacionSire.fecha_presentacion)}</span>
                  </p>
                )}
                {obligacionSire.numero_orden && (
                  <p>
                    N.º de orden SUNAT: <span className="font-semibold text-nexa-navy">{obligacionSire.numero_orden}</span>
                  </p>
                )}
                {obligacionSire.observaciones && (
                  <p className="text-nexa-topbar-muted">Observaciones: {obligacionSire.observaciones}</p>
                )}
              </div>
            )}
            <div className="mt-3">
              <ObligacionSunatModal
                tipo="sire"
                periodo={periodo}
                periodoLabel={nombrePeriodo(periodo)}
                fechaLimite={fechaSire}
                registro={obligacionSire}
                action={actualizarObligacionSunat}
              />
            </div>
          </div>

          {/* FV621 */}
          <div className="rounded-[14px] border border-nexa-border bg-white p-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
                FV621 — IGV / Renta mensual
              </p>
              <EstadoObligacionBadge
                clasificacion={clasificacion}
                fechaLimite={fechaFv621}
                hoy={hoy}
                registro={obligacionFv621}
              />
            </div>
            <p className="text-[13px] text-nexa-topbar-text">
              Fecha de vencimiento:{" "}
              <span className="font-semibold text-nexa-navy">
                {fechaFv621 ? formatFecha(fechaFv621) : "Sin cronograma"}
              </span>
            </p>
            {obligacionFv621 && obligacionFv621.estado !== "pendiente" && (
              <div className="mt-3 space-y-3 text-[13px] text-nexa-topbar-text">
                <p>
                  Estado:{" "}
                  <span className="font-semibold text-nexa-navy">{OBLIGACION_ESTADO_LABELS[obligacionFv621.estado]}</span>
                </p>

                {/* Declarado y pagado son hechos distintos — declarado NO
                    implica pagado, así que se muestran por separado y
                    nunca se inventa un importe que no se registró. */}
                <div className="rounded-md bg-nexa-app-bg p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-blue">Declarado en SUNAT</p>
                  <dl className="mt-1.5 space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-nexa-topbar-muted">IGV declarado</dt>
                      <dd className="num font-semibold text-nexa-navy">
                        {obligacionFv621.monto_igv !== null ? formatSoles(obligacionFv621.monto_igv) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-nexa-topbar-muted">Renta declarada</dt>
                      <dd className="num font-semibold text-nexa-navy">
                        {obligacionFv621.monto_renta !== null ? formatSoles(obligacionFv621.monto_renta) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-nexa-topbar-muted">Total declarado</dt>
                      <dd className="num font-semibold text-nexa-navy">
                        {obligacionFv621.total_declarado !== null ? formatSoles(obligacionFv621.total_declarado) : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-nexa-topbar-muted">Fecha de declaración</dt>
                      <dd className="font-semibold text-nexa-navy">
                        {obligacionFv621.fecha_presentacion ? formatFecha(obligacionFv621.fecha_presentacion) : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-md bg-nexa-app-bg p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-blue">Pago SUNAT</p>
                  {obligacionFv621.estado === "declarado" ? (
                    <p className="mt-1.5 font-semibold text-nexa-alert">Pago pendiente</p>
                  ) : (
                    <dl className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-nexa-topbar-muted">Total pagado</dt>
                        <dd className="num font-semibold text-nexa-navy">
                          {obligacionFv621.total_pagado !== null ? formatSoles(obligacionFv621.total_pagado) : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-nexa-topbar-muted">Fecha de pago</dt>
                        <dd className="font-semibold text-nexa-navy">
                          {obligacionFv621.fecha_pago ? formatFecha(obligacionFv621.fecha_pago) : "—"}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>

                {obligacionFv621.numero_orden && (
                  <p>
                    N.º de orden SUNAT: <span className="font-semibold text-nexa-navy">{obligacionFv621.numero_orden}</span>
                  </p>
                )}
                {obligacionFv621.observaciones && (
                  <p className="text-nexa-topbar-muted">Observaciones: {obligacionFv621.observaciones}</p>
                )}
              </div>
            )}
            <div className="mt-3">
              <ObligacionSunatModal
                tipo="fv621"
                periodo={periodo}
                periodoLabel={nombrePeriodo(periodo)}
                fechaLimite={fechaFv621}
                registro={obligacionFv621}
                action={actualizarObligacionSunat}
              />
            </div>
          </div>
        </div>

        {/* ESTIMADO VS. REAL */}
        {comparacion && (
          <div className="rounded-[14px] border border-nexa-border bg-white p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
              Estimado vs. declarado
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-nexa-border text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
                    <th className="py-2"></th>
                    <th className="py-2">IGV</th>
                    <th className="py-2">Renta</th>
                    <th className="py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-nexa-border">
                    <td className="py-2 font-semibold text-nexa-topbar-text">Estimado por Nexa</td>
                    <td className="num py-2">{formatSoles(comparacion.estimadoIgv)}</td>
                    <td className="num py-2">{formatSoles(comparacion.estimadoRenta)}</td>
                    <td className="num py-2 font-bold">{formatSoles(comparacion.estimadoTotal)}</td>
                  </tr>
                  <tr className="border-b border-nexa-border">
                    <td className="py-2 font-semibold text-nexa-topbar-text">Declarado en SUNAT</td>
                    <td className="num py-2">{formatSoles(comparacion.declaradoIgv)}</td>
                    <td className="num py-2">{formatSoles(comparacion.declaradoRenta)}</td>
                    <td className="num py-2 font-bold">{formatSoles(comparacion.declaradoTotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold text-nexa-topbar-text">Diferencia</td>
                    <td className={`num py-2 font-semibold ${comparacion.diferenciaIgv === 0 ? "text-nexa-topbar-text" : comparacion.diferenciaIgv > 0 ? "text-nexa-alert" : "text-nexa-positive"}`}>
                      {comparacion.diferenciaIgv > 0 ? "+" : ""}
                      {formatSoles(comparacion.diferenciaIgv)}
                    </td>
                    <td className={`num py-2 font-semibold ${comparacion.diferenciaRenta === 0 ? "text-nexa-topbar-text" : comparacion.diferenciaRenta > 0 ? "text-nexa-alert" : "text-nexa-positive"}`}>
                      {comparacion.diferenciaRenta > 0 ? "+" : ""}
                      {formatSoles(comparacion.diferenciaRenta)}
                    </td>
                    <td className={`num py-2 font-bold ${comparacion.diferenciaTotal === 0 ? "text-nexa-topbar-text" : comparacion.diferenciaTotal > 0 ? "text-nexa-alert" : "text-nexa-positive"}`}>
                      {comparacion.diferenciaTotal > 0 ? "+" : ""}
                      {formatSoles(comparacion.diferenciaTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-nexa-topbar-muted">
              La diferencia es solo informativa (declarado − estimado). Nunca se modifican los comprobantes
              originales para hacerlos coincidir con lo declarado en SUNAT.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
