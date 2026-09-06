import Topbar from "@/components/Topbar";
import ProximamenteCard from "@/components/ProximamenteCard";

export default function GastosPage() {
  return (
    <>
      <Topbar title="Gastos" subtitle="Costos operativos de Nexa Consulting TI" />
      <ProximamenteCard
        fase="la Fase 3"
        detalle="Tabla de gastos, gasto por categoría y punto de equilibrio mensual."
      />
    </>
  );
}
