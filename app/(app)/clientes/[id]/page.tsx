import { notFound } from "next/navigation";
import Topbar from "@/components/Topbar";
import SubmitButton from "@/components/SubmitButton";
import AgregarAdjuntoButton from "@/components/AgregarAdjuntoButton";
import { createClient } from "@/lib/supabase/server";
import { formatSoles, formatFecha } from "@/lib/format";
import { proximoCobro, diasHasta, diaCobroAFecha } from "@/lib/cobranza";
import {
  CLIENTE_ESTADOS,
  CLIENTE_ESTADO_LABELS,
  estadoComprobanteDisplay,
  type Cliente,
  type ComprobanteAdjunto,
  type NotaCliente,
} from "@/lib/types";
import { updateCliente, addNotaCliente } from "../actions";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20";
const labelClass = "text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted";

export default async function ClienteFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("core_clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cliente) notFound();
  const c = cliente as Cliente;

  const [{ data: comprobantes }, { data: notas }] = await Promise.all([
    supabase
      .from("core_comprobantes")
      .select("*")
      .eq("cliente_id", id)
      .order("fecha_emision", { ascending: false }),
    supabase
      .from("core_notas_cliente")
      .select("*")
      .eq("cliente_id", id)
      .order("fecha", { ascending: false }),
  ]);

  let facturado = 0;
  let cobrado = 0;
  for (const comp of comprobantes ?? []) {
    if (comp.estado_pago === "anulado") continue;
    facturado += comp.total;
    if (comp.estado_pago === "cobrado") cobrado += comp.total;
  }
  const porCobrar = facturado - cobrado;

  const adjuntosPorComprobante = new Map<string, ComprobanteAdjunto[]>();
  if (comprobantes && comprobantes.length > 0) {
    const { data: adjuntos } = await supabase
      .from("core_comprobante_adjuntos")
      .select("*")
      .in(
        "comprobante_id",
        comprobantes.map((c) => c.id),
      );
    for (const a of (adjuntos ?? []) as ComprobanteAdjunto[]) {
      const arr = adjuntosPorComprobante.get(a.comprobante_id) ?? [];
      arr.push(a);
      adjuntosPorComprobante.set(a.comprobante_id, arr);
    }
  }

  const proximo = c.dia_cobro ? proximoCobro(c.dia_cobro) : null;
  const diasParaCobro = proximo ? diasHasta(proximo) : null;

  const update = updateCliente.bind(null, id);
  const addNota = addNotaCliente.bind(null, id);

  return (
    <>
      <Topbar title={c.nombre_comercial || c.nombre} subtitle={`${c.tipo_documento} ${c.numero_documento}`} />

      <div className="grid grid-cols-1 gap-6 p-7 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {message && (
            <div className="rounded-md bg-nexa-light px-3 py-2 text-sm text-nexa-blue">{message}</div>
          )}
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-[14px] border border-nexa-border bg-white p-5">
              <p className={labelClass}>Facturado</p>
              <p className="num mt-1 text-xl font-bold text-nexa-navy">{formatSoles(facturado)}</p>
            </div>
            <div className="rounded-[14px] border border-nexa-border bg-white p-5">
              <p className={labelClass}>Cobrado</p>
              <p className="num mt-1 text-xl font-bold text-nexa-positive">{formatSoles(cobrado)}</p>
            </div>
            <div className="rounded-[14px] border border-nexa-border bg-white p-5">
              <p className={labelClass}>Por cobrar</p>
              <p className="num mt-1 text-xl font-bold text-nexa-alert">{formatSoles(porCobrar)}</p>
            </div>
            <div className="rounded-[14px] border border-nexa-border bg-nexa-navy p-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wide text-nexa-sidebar-text-muted">
                Próximo cobro
              </p>
              {proximo ? (
                <>
                  <p className="mt-1 text-lg font-bold">{formatFecha(proximo)}</p>
                  <p className="text-[11.5px] text-nexa-sidebar-text-muted">
                    {diasParaCobro !== null && diasParaCobro <= 0
                      ? "Hoy o vencido"
                      : `En ${diasParaCobro} día${diasParaCobro === 1 ? "" : "s"}`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-nexa-sidebar-text-muted">No aplica</p>
              )}
            </div>
          </div>

          {/* Datos editables */}
          <form action={update} className="rounded-[14px] border border-nexa-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-nexa-navy">Datos del cliente</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Razón social / nombre</label>
                <input name="nombre" defaultValue={c.nombre} required className={`${inputClass} mt-1`} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Nombre comercial</label>
                <input
                  name="nombre_comercial"
                  defaultValue={c.nombre_comercial ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Tipo documento</label>
                <select name="tipo_documento" defaultValue={c.tipo_documento} className={`${inputClass} mt-1`}>
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Número documento</label>
                <input
                  name="numero_documento"
                  defaultValue={c.numero_documento}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Distrito</label>
                <input name="distrito" defaultValue={c.distrito ?? ""} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input name="direccion" defaultValue={c.direccion ?? ""} className={`${inputClass} mt-1`} />
              </div>
              <div>
                <label className={labelClass}>Contacto: nombre</label>
                <input
                  name="contacto_nombre"
                  defaultValue={c.contacto_nombre ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Contacto: cargo</label>
                <input
                  name="contacto_cargo"
                  defaultValue={c.contacto_cargo ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Contacto: teléfono</label>
                <input
                  name="contacto_telefono"
                  defaultValue={c.contacto_telefono ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Contacto: correo</label>
                <input
                  name="contacto_correo"
                  type="email"
                  defaultValue={c.contacto_correo ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <label className={labelClass}>Estado</label>
                <select name="estado" defaultValue={c.estado} className={`${inputClass} mt-1`}>
                  {CLIENTE_ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {CLIENTE_ESTADO_LABELS[e]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Día de cobro</label>
                <input
                  name="dia_cobro"
                  type="date"
                  defaultValue={diaCobroAFecha(c.dia_cobro)}
                  className={`${inputClass} mt-1`}
                  title="Elige cualquier fecha; solo se guarda el día del mes. Vacío = no aplica."
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Notas generales</label>
                <textarea name="notas" defaultValue={c.notas ?? ""} rows={3} className={`${inputClass} mt-1`} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
                Guardar cambios
              </SubmitButton>
            </div>
          </form>

          {/* Comprobantes */}
          <div className="rounded-[14px] border border-nexa-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-nexa-navy">Comprobantes</h2>
            {(!comprobantes || comprobantes.length === 0) ? (
              <p className="text-sm text-nexa-topbar-muted">Todavía no hay comprobantes registrados.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-nexa-border text-[11px] font-bold uppercase text-nexa-topbar-muted">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Serie-número</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {comprobantes.map((comp) => (
                    <tr key={comp.id} className="border-b border-nexa-border last:border-0">
                      <td className="py-2">{formatFecha(comp.fecha_emision)}</td>
                      <td className="py-2">{comp.tipo}</td>
                      <td className="py-2">{comp.serie_numero ?? "—"}</td>
                      <td className="num py-2 text-right">{formatSoles(comp.total)}</td>
                      <td className="py-2 capitalize">{estadoComprobanteDisplay(comp)}</td>
                      <td className="py-2">
                        {comp.url_adjunto && (
                          <a
                            href={`/api/adjuntos/${encodeURIComponent(comp.url_adjunto)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-[12px] font-semibold text-nexa-blue hover:underline"
                          >
                            Adjunto
                          </a>
                        )}
                        {comp.nubefact_pdf_url && (
                          <a
                            href={comp.nubefact_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-[12px] font-semibold text-nexa-positive hover:underline"
                          >
                            PDF SUNAT
                          </a>
                        )}
                        {(adjuntosPorComprobante.get(comp.id) ?? []).map((a) => (
                          <a
                            key={a.id}
                            href={`/api/adjuntos/${encodeURIComponent(a.storage_path)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={a.nombre ?? undefined}
                            className="mr-2 text-[12px] font-semibold text-nexa-blue hover:underline"
                          >
                            {a.nombre && a.nombre.length > 14 ? "Adjunto" : a.nombre || "Adjunto"}
                          </a>
                        ))}
                        <AgregarAdjuntoButton comprobanteId={comp.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Notas / actividad */}
        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-nexa-navy">Actividad y notas</h2>
          <form action={addNota} className="mb-4 space-y-2">
            <textarea
              name="nota"
              required
              placeholder="Escribe una nota de seguimiento..."
              rows={3}
              className={inputClass}
            />
            <SubmitButton variant="dark" pendingLabel="Guardando..." className="w-full rounded-md px-3 py-2 text-sm font-medium">
              Agregar nota
            </SubmitButton>
          </form>
          <div className="space-y-3">
            {(!notas || notas.length === 0) && (
              <p className="text-sm text-nexa-topbar-muted">Sin notas todavía.</p>
            )}
            {(notas as NotaCliente[] | null)?.map((n) => (
              <div key={n.id} className="rounded-md border border-nexa-border p-3">
                <p className="text-[11px] font-semibold text-nexa-topbar-muted">{formatFecha(n.fecha)}</p>
                <p className="mt-1 text-sm text-nexa-topbar-text">{n.nota}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
