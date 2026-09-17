// Badge de estado para una obligación SUNAT (SIRE o FV621) de un período,
// usado en las páginas del módulo /sunat. Distingue "futuro"/"en_curso"
// (clasificación del período) de los estados reales de una obligación ya
// cerrada (pendiente/próximo a vencer/vencido, o cumplida con su etiqueta
// real: presentado/declarado/pagado) — reutiliza getTaxObligationStatus,
// la misma función que ya usa el Panel.
import { OBLIGACION_ESTADO_LABELS, obligacionCumplida, type ObligacionSunat } from "@/lib/types";
import {
  getTaxObligationStatus,
  type ClasificacionPeriodo,
  type EstadoUrgenciaObligacion,
} from "@/lib/taxService";

const ESTILO: Record<"futuro" | "en_curso" | EstadoUrgenciaObligacion, string> = {
  futuro: "bg-slate-100 text-slate-500",
  en_curso: "bg-nexa-light text-nexa-blue",
  cumplido: "bg-nexa-positive/10 text-nexa-positive",
  normal: "bg-nexa-light text-nexa-blue",
  proximo: "bg-amber-100 text-amber-700",
  urgente: "bg-orange-100 text-orange-700",
  vencido: "bg-nexa-alert/10 text-nexa-alert",
};

export default function EstadoObligacionBadge({
  clasificacion,
  fechaLimite,
  hoy,
  registro,
}: {
  clasificacion: ClasificacionPeriodo;
  fechaLimite: string | null;
  hoy: Date;
  registro: ObligacionSunat | null;
}) {
  if (clasificacion === "futuro") {
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTILO.futuro}`}>Futuro</span>;
  }
  if (clasificacion === "en_curso") {
    return (
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTILO.en_curso}`}>En curso</span>
    );
  }
  if (!fechaLimite) {
    return (
      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
        Sin cronograma
      </span>
    );
  }

  const { estado, diasRestantes } = getTaxObligationStatus(
    fechaLimite,
    hoy,
    obligacionCumplida(registro?.estado ?? "pendiente"),
  );

  const label =
    estado === "cumplido" && registro
      ? OBLIGACION_ESTADO_LABELS[registro.estado]
      : estado === "vencido"
        ? "Vencido"
        : estado === "urgente"
          ? `Vence en ${diasRestantes}d`
          : estado === "proximo"
            ? "Próximo a vencer"
            : "Pendiente";

  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ESTILO[estado]}`}>{label}</span>;
}
