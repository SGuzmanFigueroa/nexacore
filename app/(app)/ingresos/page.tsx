import Topbar from "@/components/Topbar";
import ProximamenteCard from "@/components/ProximamenteCard";

export default function IngresosPage() {
  return (
    <>
      <Topbar title="Ingresos" subtitle="Comprobantes y cobranzas" />
      <ProximamenteCard
        fase="la Fase 2"
        detalle="Comprobantes con filtros por estado y medio de pago, y el modal de Registrar movimiento."
      />
    </>
  );
}
