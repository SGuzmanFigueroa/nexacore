import Link from "next/link";
import Topbar from "@/components/Topbar";
import EstadoObligacionBadge from "@/components/EstadoObligacionBadge";
import SunatAnioSelector from "@/components/SunatAnioSelector";
import { createClient } from "@/lib/supabase/server";
import { formatSoles } from "@/lib/format";
import { REGIMEN_RENTA_LABELS, type Comprobante, type Configuracion, type Gasto, type ObligacionSunat } from "@/lib/types";
import { getSunatDeadline, nombrePeriodo, tieneCronograma } from "@/lib/sunatCalendar";
import { buildEstimadoPeriodo, classifyPeriod, getPeriodsForYear, getTaxPeriod } from "@/lib/taxService";

export default async function SunatPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioParam } = await searchParams;
  const supabase = await createClient();

  const hoy = new Date();
  const anioActualNum = hoy.getFullYear();
  const anios = Array.from({ length: 4 }, (_, i) => String(anioActualNum - 1 + i));
  const anio = anioParam && anios.includes(anioParam) ? anioParam : String(anioActualNum);

  const [{ data: configRaw }, { data: comprobantesRaw }, { data: gastosRaw }, { data: obligacionesRaw }] =
    await Promise.all([
      supabase.from("core_configuracion").select("*").eq("id", true).single(),
      supabase
        .from("core_comprobantes")
        .select("fecha_emision, subtotal, igv, total, estado_pago")
        .gte("fecha_emision", `${anio}-01-01`)
        .lte("fecha_emision", `${anio}-12-31`),
      supabase.from("core_gastos").select("fecha, igv, credito_fiscal, anulado").gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`),
      supabase.from("core_obligaciones_sunat").select("*").gte("periodo", `${anio}-01`).lte("periodo", `${anio}-12`),
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
  const cronogramaCargado = tieneCronograma(anio);

  const filas = getPeriodsForYear(anio).map((periodo) => {
    const comprobantesPeriodo = comprobantes.filter(
      (c) => getTaxPeriod(c.fecha_emision) === periodo && c.estado_pago !== "anulado",
    );
    const gastosPeriodo = gastos.filter((g) => getTaxPeriod(g.fecha) === periodo);
    const estimado = buildEstimadoPeriodo(comprobantesPeriodo, gastosPeriodo, config.regimen_renta);
    const clasificacion = classifyPeriod(periodo, hoy);
    const obligacionSire = obligaciones.find((o) => o.periodo === periodo && o.tipo === "sire") ?? null;
    const obligacionFv621 = obligaciones.find((o) => o.periodo === periodo && o.tipo === "fv621") ?? null;

    return {
      periodo,
      clasificacion,
      estimado,
      obligacionSire,
      obligacionFv621,
      fechaSire: getSunatDeadline(periodo, config.ruc, "sire"),
      fechaFv621: getSunatDeadline(periodo, config.ruc, "fv621"),
    };
  });

  return (
    <>
      <Topbar title="SUNAT" subtitle="Control de obligaciones tributarias" />

      <div className="space-y-6 p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-nexa-topbar-muted">{REGIMEN_RENTA_LABELS[config.regimen_renta]}</p>
          <SunatAnioSelector anio={anio} anios={anios} />
        </div>

        {!cronogramaCargado && (
          <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Calendario SUNAT aún no configurado para este año. Las ventas, IGV y Renta estimados igual se calculan a
            partir de tus movimientos, pero no se muestran fechas de vencimiento para SIRE/FV621.
          </div>
        )}

        <div className="overflow-x-auto rounded-[14px] border border-nexa-border bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-nexa-border text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Ventas</th>
                <th className="px-4 py-3">IGV</th>
                <th className="px-4 py-3">Renta</th>
                <th className="px-4 py-3">SIRE</th>
                <th className="px-4 py-3">FV621</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.periodo} className="border-b border-nexa-border last:border-0 hover:bg-nexa-app-bg">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sunat/${fila.periodo.replace("-", "/")}`}
                      className="font-semibold text-nexa-navy hover:text-nexa-blue hover:underline"
                    >
                      {nombrePeriodo(fila.periodo)}
                    </Link>
                  </td>
                  <td className="num px-4 py-3 text-nexa-topbar-text">{formatSoles(fila.estimado.ventasFacturadas)}</td>
                  <td className="num px-4 py-3 text-nexa-topbar-text">{formatSoles(fila.estimado.igvPorPagar)}</td>
                  <td className="num px-4 py-3 text-nexa-topbar-text">{formatSoles(fila.estimado.pagoACuentaRenta)}</td>
                  <td className="px-4 py-3">
                    <EstadoObligacionBadge
                      clasificacion={fila.clasificacion}
                      fechaLimite={fila.fechaSire}
                      hoy={hoy}
                      registro={fila.obligacionSire}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <EstadoObligacionBadge
                      clasificacion={fila.clasificacion}
                      fechaLimite={fila.fechaFv621}
                      hoy={hoy}
                      registro={fila.obligacionFv621}
                    />
                  </td>
                  <td className="num px-4 py-3 font-bold text-nexa-navy">{formatSoles(fila.estimado.reservaTributaria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-nexa-topbar-muted">
          Ventas, IGV y Renta son estimaciones informativas calculadas a partir de lo registrado en Nexa Core. El
          importe definitivo debe verificarse en SUNAT y no reemplaza la declaración tributaria ni el criterio de un
          contador.
        </p>
      </div>
    </>
  );
}
