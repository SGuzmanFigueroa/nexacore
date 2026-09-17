import Link from "next/link";
import Topbar from "@/components/Topbar";
import RegistrarMovimientoModal from "@/components/RegistrarMovimientoModal";
import BarrasIngresosGastos from "@/components/BarrasIngresosGastos";
import ObligacionSunatModal from "@/components/ObligacionSunatModal";
import EstadoObligacionBadge from "@/components/EstadoObligacionBadge";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import {
  estadoComprobanteDisplay,
  REGIMEN_RENTA_LABELS,
  type Cliente,
  type Comprobante,
  type Configuracion,
  type Gasto,
  type ObligacionSunat,
} from "@/lib/types";
import { getSunatDeadline, nombrePeriodo } from "@/lib/sunatCalendar";
import { buildEstimadoPeriodo, calculateCollectionsAfterTaxReserve, getRentaRate } from "@/lib/taxService";
import { proximoCobro, diasHasta } from "@/lib/cobranza";
import { actualizarObligacionSunat } from "./actions";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const hoy = new Date();
  const inicioVentana = new Date(hoy.getFullYear(), hoy.getMonth() - 4, 1)
    .toISOString()
    .slice(0, 10);
  const mesActual = hoy.toISOString().slice(0, 7);
  // Período que corresponde declarar AHORA: el mes anterior al actual. Un
  // período tributario siempre se declara/paga el mes siguiente a que
  // cierra, así que lo que "toca declarar" en un momento dado es siempre
  // el mes ya cerrado, no el que todavía se está acumulando.
  const periodoObligacion = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7);

  const [
    { data: comprobantesRaw },
    { data: gastosRaw },
    { data: clientes },
    { data: configRaw },
    { data: obligacionesRaw },
  ] = await Promise.all([
    supabase
      .from("core_comprobantes")
      .select("*, core_clientes(nombre, nombre_comercial)")
      .gte("fecha_emision", inicioVentana)
      .order("fecha_emision", { ascending: false }),
    supabase.from("core_gastos").select("*").gte("fecha", inicioVentana).order("fecha", { ascending: false }),
    supabase.from("core_clientes").select("id, nombre, nombre_comercial").order("nombre"),
    supabase.from("core_configuracion").select("*").eq("id", true).single(),
    supabase.from("core_obligaciones_sunat").select("*").eq("periodo", periodoObligacion),
  ]);

  const { data: clientesConCobro } = await supabase
    .from("core_clientes")
    .select("*")
    .not("dia_cobro", "is", null)
    .in("estado", ["activo", "piloto"]);

  type ComprobanteConCliente = Comprobante & {
    core_clientes: { nombre: string; nombre_comercial: string | null } | null;
  };
  const comprobantes = (comprobantesRaw ?? []) as ComprobanteConCliente[];
  const gastos = ((gastosRaw ?? []) as Gasto[]).filter((g) => !g.anulado);
  const config = configRaw as Configuracion;

  const ingresosMes = comprobantes
    .filter((c) => monthKey(c.fecha_emision) === mesActual && c.estado_pago !== "anulado")
    .reduce((s, c) => s + c.total, 0);
  const gastosMes = gastos
    .filter((g) => monthKey(g.fecha) === mesActual)
    .reduce((s, g) => s + g.monto, 0);
  const utilidadMes = ingresosMes - gastosMes;
  const porCobrar = comprobantes
    .filter((c) => c.estado_pago === "pendiente")
    .reduce((s, c) => s + c.total, 0);
  const cobradoMes = comprobantes
    .filter((c) => c.fecha_cobro && monthKey(c.fecha_cobro) === mesActual && c.estado_pago === "cobrado")
    .reduce((s, c) => s + c.total, 0);

  const proximosCobros = ((clientesConCobro ?? []) as Cliente[])
    .map((cl) => ({ cliente: cl, fecha: proximoCobro(cl.dia_cobro!, hoy) }))
    .filter((x) => diasHasta(x.fecha, hoy) <= 15)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 6);

  const barras = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (4 - i), 1);
    const key = d.toISOString().slice(0, 7);
    return {
      label: MESES[d.getMonth()],
      ingresos: comprobantes
        .filter((c) => monthKey(c.fecha_emision) === key && c.estado_pago !== "anulado")
        .reduce((s, c) => s + c.total, 0),
      gastos: gastos.filter((g) => monthKey(g.fecha) === key).reduce((s, g) => s + g.monto, 0),
    };
  });

  // Estimado SUNAT del período que corresponde declarar ahora (el mes
  // cerrado anterior, no el que todavía se está acumulando — ver arriba).
  // Misma agregación que usa /sunat (lib/taxService.buildEstimadoPeriodo):
  // IGV de ventas del período menos crédito fiscal de compras del mismo
  // período, y pago a cuenta de Renta sobre la BASE imponible (sin IGV) —
  // nunca sobre el total cobrado con IGV incluido. Es informativo, nunca
  // se envía a SUNAT.
  const comprobantesPeriodo = comprobantes.filter(
    (c) => monthKey(c.fecha_emision) === periodoObligacion && c.estado_pago !== "anulado",
  );
  const gastosPeriodo = gastos.filter((g) => monthKey(g.fecha) === periodoObligacion);
  const estimadoPeriodo = buildEstimadoPeriodo(comprobantesPeriodo, gastosPeriodo, config.regimen_renta);
  const tasaRenta = getRentaRate(config.regimen_renta);

  // Estimación tributaria del MES EN CURSO (distinta de "Obligaciones
  // SUNAT" arriba, que es el período ya cerrado que corresponde declarar
  // ahora). Esto es solo para saber cuánto conviene reservar de lo que se
  // va facturando/cobrando este mes — no es una obligación exigible
  // todavía: ese período se declara recién el mes que viene.
  const comprobantesMesActual = comprobantes.filter(
    (c) => monthKey(c.fecha_emision) === mesActual && c.estado_pago !== "anulado",
  );
  const gastosMesActualArr = gastos.filter((g) => monthKey(g.fecha) === mesActual);
  const estimadoMesActual = buildEstimadoPeriodo(comprobantesMesActual, gastosMesActualArr, config.regimen_renta);
  // Control de efectivo: SOLO mide lo cobrado este mes contra la reserva
  // tributaria estimada — no es el saldo de caja/bancos de la empresa (que
  // puede tener acumulado de meses anteriores). Nunca se muestra como
  // "disponible" negativo: si no alcanza, se informa como reserva
  // pendiente de cubrir.
  const { disponible: disponibleCobrosMes, reservaPendiente } = calculateCollectionsAfterTaxReserve(
    cobradoMes,
    estimadoMesActual.reservaTributaria,
  );
  const fechaSireMesActual = getSunatDeadline(mesActual, config.ruc, "sire");
  const fechaFv621MesActual = getSunatDeadline(mesActual, config.ruc, "fv621");

  const obligaciones = (obligacionesRaw ?? []) as ObligacionSunat[];
  const obligacionSire = obligaciones.find((o) => o.tipo === "sire") ?? null;
  const obligacionFv621 = obligaciones.find((o) => o.tipo === "fv621") ?? null;
  const fechaSire = getSunatDeadline(periodoObligacion, config.ruc, "sire");
  const fechaFv621 = getSunatDeadline(periodoObligacion, config.ruc, "fv621");

  const cobranzasPendientes = comprobantes
    .filter((c) => c.estado_pago === "pendiente")
    .sort((a, b) => (a.fecha_vencimiento ?? "9999").localeCompare(b.fecha_vencimiento ?? "9999"))
    .slice(0, 6);

  const ultimosMovimientos = [
    ...comprobantes.map((c) => ({
      id: `c-${c.id}`,
      fecha: c.fecha_emision,
      creado: c.created_at,
      texto: `${c.core_clientes?.nombre_comercial || c.core_clientes?.nombre || "Cliente"} · ${c.concepto ?? c.tipo}`,
      monto: c.total,
      tipo: "ingreso" as const,
    })),
    ...gastos.map((g) => ({
      id: `g-${g.id}`,
      fecha: g.fecha,
      creado: g.created_at,
      texto: g.concepto,
      monto: g.monto,
      tipo: "gasto" as const,
    })),
  ]
    .sort((a, b) => b.creado.localeCompare(a.creado))
    .slice(0, 8);

  return (
    <>
      <Topbar
        title="Panel general"
        subtitle={`${config.razon_social} — RUC ${config.ruc}`}
        actions={<RegistrarMovimientoModal clientes={clientes ?? []} />}
      />

      <div className="space-y-6 p-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-[14px] border border-nexa-border bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Ingresos del mes</p>
            <p className="num mt-1 text-xl font-bold text-nexa-navy">{formatSoles(ingresosMes)}</p>
          </div>
          <div className="rounded-[14px] border border-nexa-border bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Gastos del mes</p>
            <p className="num mt-1 text-xl font-bold text-nexa-navy">{formatSoles(gastosMes)}</p>
          </div>
          <div className="rounded-[14px] border border-nexa-border bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Utilidad del mes</p>
            <p className={`num mt-1 text-xl font-bold ${utilidadMes >= 0 ? "text-nexa-positive" : "text-nexa-alert"}`}>
              {formatSoles(utilidadMes)}
            </p>
          </div>
          <div className="rounded-[14px] border border-nexa-border bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">Cobrado del mes</p>
            <p className="num mt-1 text-xl font-bold text-nexa-positive">{formatSoles(cobradoMes)}</p>
          </div>
          <div className="rounded-[14px] border border-nexa-border bg-nexa-navy p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-sidebar-text-muted">Por cobrar</p>
            <p className="num mt-1 text-xl font-bold">{formatSoles(porCobrar)}</p>
          </div>
        </div>

        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          {(error || message) && (
            <div
              className={`mb-4 rounded-md px-3 py-2 text-sm ${
                error ? "bg-red-50 text-red-700" : "bg-nexa-light text-nexa-blue"
              }`}
            >
              {error || message}
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
              Obligaciones SUNAT pendientes — {nombrePeriodo(periodoObligacion)} ·{" "}
              {REGIMEN_RENTA_LABELS[config.regimen_renta]}
            </p>
            <Link href="/sunat" className="shrink-0 text-[11px] font-semibold text-nexa-blue hover:underline">
              Ver historial SUNAT →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV ventas</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoPeriodo.igvVentas)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Crédito fiscal</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoPeriodo.creditoFiscal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV estimado por pagar</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">
                {formatSoles(estimadoPeriodo.igvPorPagar)}
                {estimadoPeriodo.saldoFavor > 0 && (
                  <span className="ml-1 text-[11px] font-semibold text-nexa-positive">
                    ({formatSoles(estimadoPeriodo.saldoFavor)} a favor)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">
                Pago a cuenta Renta ({(tasaRenta * 100).toFixed(1)}%)
              </p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoPeriodo.pagoACuentaRenta)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Total estimado</p>
              <p className="num mt-1 text-lg font-bold text-nexa-alert">{formatSoles(estimadoPeriodo.reservaTributaria)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-nexa-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-nexa-navy">Registros SIRE</p>
                  <p className="text-[11px] text-nexa-topbar-muted">
                    {fechaSire ? `Vence ${formatFecha(fechaSire)}` : "Cronograma no cargado para este período"}
                  </p>
                </div>
                <EstadoObligacionBadge clasificacion="pasado" fechaLimite={fechaSire} hoy={hoy} registro={obligacionSire} />
              </div>
              <div className="mt-2">
                <ObligacionSunatModal
                  tipo="sire"
                  periodo={periodoObligacion}
                  periodoLabel={nombrePeriodo(periodoObligacion)}
                  fechaLimite={fechaSire}
                  registro={obligacionSire}
                  action={actualizarObligacionSunat}
                />
              </div>
            </div>

            <div className="rounded-md border border-nexa-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-semibold text-nexa-navy">Declaración FV 621</p>
                  <p className="text-[11px] text-nexa-topbar-muted">
                    {fechaFv621 ? `Vence ${formatFecha(fechaFv621)}` : "Cronograma no cargado para este período"}
                  </p>
                </div>
                <EstadoObligacionBadge clasificacion="pasado" fechaLimite={fechaFv621} hoy={hoy} registro={obligacionFv621} />
              </div>
              <div className="mt-2">
                <ObligacionSunatModal
                  tipo="fv621"
                  periodo={periodoObligacion}
                  periodoLabel={nombrePeriodo(periodoObligacion)}
                  fechaLimite={fechaFv621}
                  registro={obligacionFv621}
                  action={actualizarObligacionSunat}
                />
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-nexa-topbar-muted">
            Estimación informativa basada en los movimientos registrados en Nexa Core. El importe definitivo debe
            verificarse en SUNAT y no reemplaza la declaración tributaria ni el criterio de un contador.
          </p>
        </div>

        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
            {nombrePeriodo(mesActual)} (mes en curso)
          </p>

          {/* 1. ESTIMACIÓN TRIBUTARIA */}
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-blue">Estimación tributaria</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Base imponible</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoMesActual.baseImponible)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV ventas</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoMesActual.igvVentas)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Crédito fiscal</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoMesActual.creditoFiscal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">IGV por pagar</p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">
                {formatSoles(estimadoMesActual.igvPorPagar)}
                {estimadoMesActual.saldoFavor > 0 && (
                  <span className="ml-1 text-[11px] font-semibold text-nexa-positive">
                    ({formatSoles(estimadoMesActual.saldoFavor)} a favor)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">
                Renta ({(tasaRenta * 100).toFixed(1)}%)
              </p>
              <p className="num mt-1 text-lg font-bold text-nexa-navy">{formatSoles(estimadoMesActual.pagoACuentaRenta)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-nexa-topbar-muted">Reserva tributaria</p>
              <p className="num mt-1 text-lg font-bold text-nexa-alert">{formatSoles(estimadoMesActual.reservaTributaria)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-nexa-topbar-muted">
            Este período se declarará el próximo mes
            {fechaSireMesActual && <> — SIRE estimado {formatFecha(fechaSireMesActual)}</>}
            {fechaFv621MesActual && <>, FV621 estimado {formatFecha(fechaFv621MesActual)}</>}.
          </p>

          {/* 2. CONTROL DE EFECTIVO */}
          <div className="mt-5 border-t border-nexa-border pt-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-blue">Control de efectivo</p>
            <div className="rounded-md bg-nexa-app-bg p-3">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <p className="text-nexa-topbar-text">Cobrado este mes</p>
                <p className="num font-semibold text-nexa-navy">{formatSoles(cobradoMes)}</p>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[13px]">
                <p className="text-nexa-topbar-text">Reserva tributaria estimada</p>
                <p className="num font-semibold text-nexa-alert">-{formatSoles(estimadoMesActual.reservaTributaria)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-nexa-border pt-2">
                <p className="text-[13px] font-bold text-nexa-navy">Disponible de los cobros del mes</p>
                <p className="num text-lg font-bold text-nexa-positive">{formatSoles(disponibleCobrosMes)}</p>
              </div>
              {reservaPendiente > 0 && (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[13px]">
                  <p className="text-nexa-alert">Reserva pendiente de cubrir</p>
                  <p className="num font-semibold text-nexa-alert">{formatSoles(reservaPendiente)}</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-nexa-topbar-muted">
              Este indicador considera únicamente los cobros registrados durante el mes. No representa el saldo total
              disponible en cuentas bancarias o caja de la empresa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[14px] border border-nexa-border bg-white p-6 lg:col-span-2">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
              Ingresos vs. gastos — últimos 5 meses
            </p>
            <BarrasIngresosGastos data={barras} />
          </div>

          <div className="rounded-[14px] border border-nexa-border bg-white p-6">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
              Cobranzas pendientes
            </p>
            <div className="space-y-2.5">
              {cobranzasPendientes.length === 0 && (
                <p className="text-sm text-nexa-topbar-muted">Sin cobranzas pendientes.</p>
              )}
              {cobranzasPendientes.map((c) => (
                <Link
                  key={c.id}
                  href={`/clientes/${c.cliente_id}`}
                  className="flex items-center justify-between rounded-md px-1 py-1 hover:bg-nexa-app-bg"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-nexa-navy">
                      {c.core_clientes?.nombre_comercial || c.core_clientes?.nombre}
                    </p>
                    <p className="text-[11px] text-nexa-topbar-muted">
                      {estadoComprobanteDisplay(c) === "vencido" ? "Vencido" : "Vence"}{" "}
                      {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "—"}
                    </p>
                  </div>
                  <span className="num shrink-0 text-[13px] font-bold text-nexa-alert">
                    {formatSoles(c.total)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
            Próximos cobros recurrentes
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {proximosCobros.length === 0 && (
              <p className="text-sm text-nexa-topbar-muted">Sin cobros recurrentes próximos.</p>
            )}
            {proximosCobros.map(({ cliente, fecha }) => {
              const dias = diasHasta(fecha, hoy);
              return (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="flex items-center justify-between rounded-md border border-nexa-border px-3 py-2 hover:bg-nexa-app-bg"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-nexa-navy">
                      {cliente.nombre_comercial || cliente.nombre}
                    </p>
                    <p className="text-[11px] text-nexa-topbar-muted">{formatFecha(fecha)}</p>
                  </div>
                  <span
                    className={`num shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      dias <= 0 ? "bg-nexa-alert/10 text-nexa-alert" : "bg-nexa-light text-nexa-blue"
                    }`}
                  >
                    {dias <= 0 ? "Hoy" : `${dias}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
            Últimos movimientos
          </p>
          <div className="space-y-2">
            {ultimosMovimientos.length === 0 && (
              <p className="text-sm text-nexa-topbar-muted">Todavía no hay movimientos registrados.</p>
            )}
            {ultimosMovimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-nexa-border py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-nexa-topbar-text">{m.texto}</p>
                  <p className="text-[11px] text-nexa-topbar-muted">{formatFecha(m.fecha)}</p>
                </div>
                <span
                  className={`num shrink-0 text-[13px] font-bold ${
                    m.tipo === "ingreso" ? "text-nexa-positive" : "text-nexa-alert"
                  }`}
                >
                  {m.tipo === "ingreso" ? "+" : "-"}
                  {formatSoles(m.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
