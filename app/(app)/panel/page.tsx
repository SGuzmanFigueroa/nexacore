import Link from "next/link";
import Topbar from "@/components/Topbar";
import RegistrarMovimientoModal from "@/components/RegistrarMovimientoModal";
import BarrasIngresosGastos from "@/components/BarrasIngresosGastos";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import { estadoComprobanteDisplay, type Comprobante, type Gasto } from "@/lib/types";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export default async function PanelPage() {
  const supabase = await createClient();

  const hoy = new Date();
  const inicioVentana = new Date(hoy.getFullYear(), hoy.getMonth() - 4, 1)
    .toISOString()
    .slice(0, 10);
  const mesActual = hoy.toISOString().slice(0, 7);

  const [
    { data: comprobantesRaw },
    { data: gastosRaw },
    { data: clientes },
  ] = await Promise.all([
    supabase
      .from("core_comprobantes")
      .select("*, core_clientes(nombre, nombre_comercial)")
      .gte("fecha_emision", inicioVentana)
      .order("fecha_emision", { ascending: false }),
    supabase.from("core_gastos").select("*").gte("fecha", inicioVentana).order("fecha", { ascending: false }),
    supabase.from("core_clientes").select("id, nombre, nombre_comercial").order("nombre"),
  ]);

  type ComprobanteConCliente = Comprobante & {
    core_clientes: { nombre: string; nombre_comercial: string | null } | null;
  };
  const comprobantes = (comprobantesRaw ?? []) as ComprobanteConCliente[];
  const gastos = (gastosRaw ?? []) as Gasto[];

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
        subtitle="NEXA CONSULTING TI S.A.C. — RUC 20616354664"
        actions={<RegistrarMovimientoModal clientes={clientes ?? []} />}
      />

      <div className="space-y-6 p-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="rounded-[14px] border border-nexa-border bg-nexa-navy p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-sidebar-text-muted">Por cobrar</p>
            <p className="num mt-1 text-xl font-bold">{formatSoles(porCobrar)}</p>
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
