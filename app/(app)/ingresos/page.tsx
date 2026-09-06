import Topbar from "@/components/Topbar";
import RegistrarMovimientoModal from "@/components/RegistrarMovimientoModal";
import MarcarCobradoForm from "@/components/MarcarCobradoForm";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import {
  COMPROBANTE_TIPO_LABELS,
  MEDIO_PAGO_LABELS,
  estadoComprobanteDisplay,
  type Comprobante,
  type EstadoComprobanteDisplay,
  type MedioPago,
} from "@/lib/types";
import { marcarCobrado, anularComprobante } from "./actions";

const ESTADO_LABELS: Record<EstadoComprobanteDisplay, string> = {
  pendiente: "Pendiente",
  cobrado: "Cobrado",
  vencido: "Vencido",
  anulado: "Anulado",
};

const ESTADO_BADGE: Record<EstadoComprobanteDisplay, string> = {
  pendiente: "bg-nexa-light text-nexa-blue",
  cobrado: "bg-nexa-positive/10 text-nexa-positive",
  vencido: "bg-nexa-alert/10 text-nexa-alert",
  anulado: "bg-slate-100 text-slate-500",
};

type ComprobanteConCliente = Comprobante & {
  core_clientes: { nombre: string; nombre_comercial: string | null } | null;
};

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; medio_pago?: string; error?: string; message?: string }>;
}) {
  const { estado, medio_pago, error, message } = await searchParams;
  const supabase = await createClient();

  const [{ data: comprobantesRaw }, { data: clientes }] = await Promise.all([
    supabase
      .from("core_comprobantes")
      .select("*, core_clientes(nombre, nombre_comercial)")
      .order("fecha_emision", { ascending: false }),
    supabase.from("core_clientes").select("id, nombre, nombre_comercial").order("nombre"),
  ]);

  let lista = (comprobantesRaw ?? []) as ComprobanteConCliente[];

  if (medio_pago) {
    lista = lista.filter((c) => c.medio_pago === medio_pago);
  }
  if (estado) {
    lista = lista.filter((c) => estadoComprobanteDisplay(c) === estado);
  }

  const emitido = lista.filter((c) => c.estado_pago !== "anulado").reduce((s, c) => s + c.total, 0);
  const cobrado = lista.filter((c) => c.estado_pago === "cobrado").reduce((s, c) => s + c.total, 0);
  const porCobrar = emitido - cobrado;

  return (
    <>
      <Topbar
        title="Ingresos"
        subtitle="Comprobantes y cobranzas"
        actions={<RegistrarMovimientoModal clientes={clientes ?? []} />}
      />

      <div className="p-7">
        {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && (
          <div className="mb-4 rounded-md bg-nexa-light px-3 py-2 text-sm text-nexa-blue">{message}</div>
        )}

        <form className="mb-4 flex flex-wrap items-center gap-3">
          <select
            name="estado"
            defaultValue={estado ?? ""}
            className="h-[38px] rounded-[9px] border border-nexa-border bg-white px-3 text-sm outline-none focus:border-nexa-blue"
          >
            <option value="">Todos los estados</option>
            {(Object.keys(ESTADO_LABELS) as EstadoComprobanteDisplay[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABELS[e]}
              </option>
            ))}
          </select>
          <select
            name="medio_pago"
            defaultValue={medio_pago ?? ""}
            className="h-[38px] rounded-[9px] border border-nexa-border bg-white px-3 text-sm outline-none focus:border-nexa-blue"
          >
            <option value="">Todos los medios de pago</option>
            {(Object.keys(MEDIO_PAGO_LABELS) as MedioPago[]).map((m) => (
              <option key={m} value={m}>
                {MEDIO_PAGO_LABELS[m]}
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
                <th className="px-5 py-3">Comprobante</th>
                <th className="px-5 py-3">Emisión</th>
                <th className="px-5 py-3">Vence</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-nexa-topbar-muted">
                    Sin comprobantes que coincidan con el filtro.
                  </td>
                </tr>
              )}
              {lista.map((c) => {
                const display = estadoComprobanteDisplay(c);
                return (
                  <tr key={c.id} className="border-b border-nexa-border last:border-0 hover:bg-nexa-app-bg">
                    <td className="px-5 py-3 font-medium text-nexa-navy">
                      {c.core_clientes?.nombre_comercial || c.core_clientes?.nombre || "—"}
                    </td>
                    <td className="px-5 py-3 text-nexa-topbar-text">
                      {COMPROBANTE_TIPO_LABELS[c.tipo]}
                      {c.serie_numero ? ` · ${c.serie_numero}` : ""}
                    </td>
                    <td className="px-5 py-3 text-nexa-topbar-text">{formatFecha(c.fecha_emision)}</td>
                    <td className="px-5 py-3 text-nexa-topbar-text">
                      {c.fecha_vencimiento ? formatFecha(c.fecha_vencimiento) : "—"}
                    </td>
                    <td className="num px-5 py-3 text-right font-semibold text-nexa-topbar-text">
                      {formatSoles(c.total)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTADO_BADGE[display]}`}>
                        {ESTADO_LABELS[display]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {(display === "pendiente" || display === "vencido") && (
                          <>
                            <MarcarCobradoForm action={marcarCobrado.bind(null, c.id)} />
                            <form action={anularComprobante.bind(null, c.id)}>
                              <ConfirmSubmitButton
                                confirmMessage="¿Anular este comprobante? Queda marcado como anulado, no se borra."
                                className="rounded-md px-2 py-1 text-[12px] font-semibold text-nexa-alert hover:bg-nexa-alert/10"
                              >
                                Anular
                              </ConfirmSubmitButton>
                            </form>
                          </>
                        )}
                        {c.url_adjunto && (
                          <a
                            href={`/api/adjuntos/${encodeURIComponent(c.url_adjunto)}`}
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
                );
              })}
            </tbody>
            {lista.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-nexa-border bg-nexa-app-bg text-[13px] font-bold text-nexa-navy">
                  <td className="px-5 py-3" colSpan={4}>
                    Totales
                  </td>
                  <td className="num px-5 py-3 text-right">{formatSoles(emitido)}</td>
                  <td className="px-5 py-3" colSpan={2}>
                    <span className="text-nexa-positive">Cobrado {formatSoles(cobrado)}</span>
                    {" · "}
                    <span className="text-nexa-alert">Por cobrar {formatSoles(porCobrar)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}
