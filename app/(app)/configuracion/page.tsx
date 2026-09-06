import Topbar from "@/components/Topbar";
import SubmitButton from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { REGIMEN_RENTA_LABELS, type Configuracion, type RegimenRenta } from "@/lib/types";
import { updateRegimen } from "./actions";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("core_configuracion").select("*").eq("id", true).single();
  const config = data as Configuracion;

  return (
    <>
      <Topbar title="Configuración" subtitle="Datos tributarios de Nexa Consulting TI" />
      <div className="max-w-lg space-y-6 p-7">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {message && (
          <div className="rounded-md bg-nexa-light px-3 py-2 text-sm text-nexa-blue">{message}</div>
        )}

        <div className="rounded-[14px] border border-nexa-border bg-white p-6">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
            Datos de la empresa (RUC)
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-nexa-topbar-muted">Razón social</dt>
              <dd className="font-medium text-nexa-navy">{config.razon_social}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-nexa-topbar-muted">RUC</dt>
              <dd className="num font-medium text-nexa-navy">{config.ruc}</dd>
            </div>
          </dl>
        </div>

        <form action={updateRegimen} className="rounded-[14px] border border-nexa-border bg-white p-6">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-nexa-topbar-muted">
            Régimen de Renta
          </p>
          <p className="mb-4 text-[12.5px] text-nexa-topbar-muted">
            Se usa para estimar el pago a cuenta de Renta en el Panel. Verifícalo en
            &ldquo;Consulta RUC&rdquo; de SUNAT si no estás seguro.
          </p>
          <select
            name="regimen_renta"
            defaultValue={config.regimen_renta}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-nexa-blue focus:ring-2 focus:ring-nexa-blue/20"
          >
            {(Object.keys(REGIMEN_RENTA_LABELS) as RegimenRenta[]).map((r) => (
              <option key={r} value={r}>
                {REGIMEN_RENTA_LABELS[r]}
              </option>
            ))}
          </select>
          <div className="mt-4 flex justify-end">
            <SubmitButton variant="primary" pendingLabel="Guardando..." className="rounded-md px-4 py-2 text-sm font-medium">
              Guardar
            </SubmitButton>
          </div>
        </form>
      </div>
    </>
  );
}
