import Topbar from "@/components/Topbar";
import ProximamenteCard from "@/components/ProximamenteCard";

export default function ReportesPage() {
  return (
    <>
      <Topbar title="Reportes" subtitle="Exportables para tu contador" />
      <ProximamenteCard
        fase="la Fase 4"
        detalle="Excel con Clientes, Ingresos, Gastos y Resumen mensual, más el cronograma de vencimientos SUNAT."
      />
    </>
  );
}
