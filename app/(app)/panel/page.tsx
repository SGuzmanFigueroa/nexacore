import Topbar from "@/components/Topbar";
import ProximamenteCard from "@/components/ProximamenteCard";

export default function PanelPage() {
  return (
    <>
      <Topbar title="Panel general" subtitle="NEXA CONSULTING TI S.A.C." />
      <ProximamenteCard
        fase="la Fase 3"
        detalle="Ingresos, gastos, utilidad y cobranzas del mes, con barras de los últimos 5 meses."
      />
    </>
  );
}
