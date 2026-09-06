import Link from "next/link";
import Topbar from "@/components/Topbar";
import NuevoClienteModal from "@/components/NuevoClienteModal";
import { createClient } from "@/lib/supabase/server";
import { formatSoles } from "@/lib/format";
import {
  CLIENTE_ESTADOS,
  CLIENTE_ESTADO_LABELS,
  type Cliente,
  type ClienteEstado,
} from "@/lib/types";

const ESTADO_BADGE: Record<ClienteEstado, string> = {
  activo: "bg-nexa-positive/10 text-nexa-positive",
  piloto: "bg-nexa-light text-nexa-blue",
  pausado: "bg-nexa-alert/10 text-nexa-alert",
  cerrado: "bg-slate-100 text-slate-500",
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; error?: string }>;
}) {
  const { q, estado, error } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("core_clientes").select("*").order("created_at", { ascending: false });

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,nombre_comercial.ilike.%${q}%,numero_documento.ilike.%${q}%`);
  }
  if (estado && (CLIENTE_ESTADOS as string[]).includes(estado)) {
    query = query.eq("estado", estado);
  }

  const { data: clientes } = await query;
  const lista = (clientes ?? []) as Cliente[];

  const clienteIds = lista.map((c) => c.id);
  const totalesPorCliente = new Map<string, { facturado: number; porCobrar: number }>();

  if (clienteIds.length > 0) {
    const { data: comprobantes } = await supabase
      .from("core_comprobantes")
      .select("cliente_id, total, estado_pago")
      .in("cliente_id", clienteIds);

    for (const c of comprobantes ?? []) {
      const acc = totalesPorCliente.get(c.cliente_id) ?? { facturado: 0, porCobrar: 0 };
      if (c.estado_pago !== "anulado") {
        acc.facturado += c.total;
        if (c.estado_pago === "pendiente") acc.porCobrar += c.total;
      }
      totalesPorCliente.set(c.cliente_id, acc);
    }
  }

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle={`${lista.length} cliente${lista.length === 1 ? "" : "s"}`}
        actions={<NuevoClienteModal />}
      />

      <div className="p-7">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <form className="mb-4 flex flex-wrap items-center gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o documento..."
            className="h-[38px] w-72 rounded-[9px] border border-nexa-border bg-white px-3 text-sm outline-none focus:border-nexa-blue"
          />
          <select
            name="estado"
            defaultValue={estado ?? ""}
            className="h-[38px] rounded-[9px] border border-nexa-border bg-white px-3 text-sm outline-none focus:border-nexa-blue"
          >
            <option value="">Todos los estados</option>
            {CLIENTE_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {CLIENTE_ESTADO_LABELS[e]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-[38px] rounded-[9px] border border-nexa-border bg-white px-4 text-sm font-medium text-nexa-topbar-text hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>

        <div className="overflow-hidden rounded-[14px] border border-nexa-border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-nexa-border bg-nexa-app-bg text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">RUC / DNI</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3 text-right">Facturado</th>
                <th className="px-5 py-3 text-right">Por cobrar</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-nexa-topbar-muted">
                    No hay clientes que coincidan con el filtro.
                  </td>
                </tr>
              )}
              {lista.map((c) => {
                const totales = totalesPorCliente.get(c.id) ?? { facturado: 0, porCobrar: 0 };
                return (
                  <tr key={c.id} className="border-b border-nexa-border last:border-0 hover:bg-nexa-app-bg">
                    <td className="px-5 py-3">
                      <Link href={`/clientes/${c.id}`} className="font-semibold text-nexa-navy hover:text-nexa-blue">
                        {c.nombre_comercial || c.nombre}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-nexa-topbar-text">
                      {c.tipo_documento} {c.numero_documento}
                    </td>
                    <td className="px-5 py-3 text-nexa-topbar-text">{c.contacto_nombre ?? "—"}</td>
                    <td className="num px-5 py-3 text-right text-nexa-topbar-text">
                      {formatSoles(totales.facturado)}
                    </td>
                    <td className="num px-5 py-3 text-right font-semibold text-nexa-alert">
                      {totales.porCobrar > 0 ? formatSoles(totales.porCobrar) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTADO_BADGE[c.estado]}`}>
                        {CLIENTE_ESTADO_LABELS[c.estado]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
