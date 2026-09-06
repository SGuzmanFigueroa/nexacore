import Topbar from "@/components/Topbar";
import RegistrarMovimientoModal from "@/components/RegistrarMovimientoModal";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import { GASTO_CATEGORIA_LABELS, type Gasto, type GastoCategoria } from "@/lib/types";
import { anularGasto } from "./actions";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; error?: string; message?: string }>;
}) {
  const { categoria, error, message } = await searchParams;
  const supabase = await createClient();

  const [{ data: gastosRaw }, { data: clientes }] = await Promise.all([
    supabase.from("core_gastos").select("*").order("fecha", { ascending: false }),
    supabase.from("core_clientes").select("id, nombre, nombre_comercial").order("nombre"),
  ]);

  const todos = (gastosRaw ?? []) as Gasto[];
  const vigentes = todos.filter((g) => !g.anulado);

  let lista = todos;
  if (categoria) lista = lista.filter((g) => g.categoria === categoria);

  const porCategoria = new Map<GastoCategoria, number>();
  for (const g of vigentes) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + g.monto);
  }
  const totalGastos = [...porCategoria.values()].reduce((s, v) => s + v, 0);
  const igvCreditoFiscal = vigentes.reduce((s, g) => s + (g.credito_fiscal ? g.igv : 0), 0);

  const puntoEquilibrio = vigentes.reduce((s, g) => {
    if (g.frecuencia === "mensual") return s + g.monto;
    if (g.frecuencia === "anual") return s + g.monto / 12;
    return s;
  }, 0);

  return (
    <>
      <Topbar
        title="Gastos"
        subtitle="Costos operativos de Nexa Consulting TI"
        actions={<RegistrarMovimientoModal clientes={clientes ?? []} />}
      />

      <div className="space-y-6 p-7">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && (
          <div className="rounded-md bg-nexa-light px-3 py-2 text-sm text-nexa-blue">{message}</div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-[14px] border border-nexa-border bg-white p-5 lg:col-span-2">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
              Gasto por categoría
            </p>
            <div className="space-y-2.5">
              {[...porCategoria.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cat, monto]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-[12.5px] font-medium text-nexa-topbar-text">
                      {GASTO_CATEGORIA_LABELS[cat]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-nexa-app-bg">
                      <div
                        className="h-full rounded-full bg-nexa-blue"
                        style={{ width: totalGastos ? `${(monto / totalGastos) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="num w-24 shrink-0 text-right text-[12.5px] font-semibold text-nexa-navy">
                      {formatSoles(monto)}
                    </span>
                  </div>
                ))}
              {porCategoria.size === 0 && (
                <p className="text-sm text-nexa-topbar-muted">Sin gastos registrados todavía.</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-nexa-border pt-3 text-[12.5px] font-semibold text-nexa-topbar-muted">
              <span>IGV con crédito fiscal disponible</span>
              <span className="num text-nexa-navy">{formatSoles(igvCreditoFiscal)}</span>
            </div>
          </div>

          <div className="rounded-[14px] border border-nexa-border bg-nexa-navy p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-sidebar-text-muted">
              Punto de equilibrio mensual
            </p>
            <p className="num mt-2 text-2xl font-bold">{formatSoles(puntoEquilibrio)}</p>
            <p className="mt-1 text-[11.5px] text-nexa-sidebar-text-muted">
              Suma de gastos mensuales + gastos anuales prorrateados /12
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-nexa-border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-nexa-border bg-nexa-app-bg text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Frecuencia</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">IGV c.f.</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-nexa-topbar-muted">
                    No hay gastos que coincidan con el filtro.
                  </td>
                </tr>
              )}
              {lista.map((g) => (
                <tr
                  key={g.id}
                  className={`border-b border-nexa-border last:border-0 hover:bg-nexa-app-bg ${g.anulado ? "opacity-50" : ""}`}
                >
                  <td className="px-5 py-3 text-nexa-topbar-text">{formatFecha(g.fecha)}</td>
                  <td className="px-5 py-3 font-medium text-nexa-navy">
                    {g.concepto}
                    {g.anulado && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Anulado
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-nexa-topbar-text">{g.proveedor ?? "—"}</td>
                  <td className="px-5 py-3 text-nexa-topbar-text">{GASTO_CATEGORIA_LABELS[g.categoria]}</td>
                  <td className="px-5 py-3 text-nexa-topbar-text capitalize">{g.frecuencia}</td>
                  <td className="num px-5 py-3 text-right font-semibold text-nexa-topbar-text">
                    {formatSoles(g.monto)}
                  </td>
                  <td className="num px-5 py-3 text-right text-nexa-topbar-text">
                    {g.credito_fiscal ? formatSoles(g.igv) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {!g.anulado && (
                        <form action={anularGasto.bind(null, g.id)}>
                          <ConfirmSubmitButton
                            confirmMessage="¿Anular este gasto? Queda marcado como anulado, no se borra."
                            className="rounded-md px-2 py-1 text-[12px] font-semibold text-nexa-alert hover:bg-nexa-alert/10"
                          >
                            Anular
                          </ConfirmSubmitButton>
                        </form>
                      )}
                      {g.url_adjunto && (
                        <a
                          href={`/api/adjuntos/${encodeURIComponent(g.url_adjunto)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md px-2 py-1 text-[12px] font-semibold text-nexa-blue hover:bg-nexa-light"
                        >
                          Adjunto
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
