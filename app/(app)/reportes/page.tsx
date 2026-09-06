import Topbar from "@/components/Topbar";
import ProximamenteCard from "@/components/ProximamenteCard";

export default function ReportesPage() {
  return (
    <>
      <Topbar title="Reportes" subtitle="Exportables para tu contador" />
      <div className="p-7">
        <div className="rounded-[14px] border border-nexa-border bg-white p-8 text-center">
          <p className="text-sm font-bold text-nexa-navy">Reporte Excel</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] text-nexa-topbar-muted">
            Clientes, Ingresos (formato tipo Registro de Ventas), Gastos y Resumen mensual.
          </p>
          <a
            href="/api/reporte"
            className="mt-4 inline-flex h-[38px] items-center gap-2 rounded-[9px] bg-nexa-blue px-4 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(11,108,255,0.28)] hover:bg-nexa-navy"
          >
            Descargar Excel
          </a>
        </div>
        <ProximamenteCard
          fase="la Fase 4 (siguiente entrega)"
          detalle="Adjuntos en Storage, cronograma de vencimientos SUNAT y cálculo estimado de IGV/Renta (régimen MYPE Tributario) — pendiente tu OK sobre el cambio de esquema en core_gastos."
        />
      </div>
    </>
  );
}
