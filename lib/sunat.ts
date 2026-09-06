import type { RegimenRenta } from "./types";

// Cronograma oficial de vencimientos mensuales de SUNAT para el ejercicio
// 2026 (declaración y pago de IGV-Renta mensual), agrupado por el último
// dígito del RUC. Fuente: cronograma publicado por SUNAT para 2026.
// SUNAT publica un cronograma nuevo cada año — hay que actualizar esta
// tabla cuando cambie el año. Formato de cada fecha: "YYYY-MM-DD".
type GrupoRuc = "0" | "1" | "2-3" | "4-5" | "6-7" | "8-9" | "buenos_contribuyentes";

const CRONOGRAMA_2026: Record<string, Record<GrupoRuc, string>> = {
  "2026-02": { "0": "2026-03-16", "1": "2026-03-17", "2-3": "2026-03-18", "4-5": "2026-03-19", "6-7": "2026-03-20", "8-9": "2026-03-23", buenos_contribuyentes: "2026-03-24" },
  "2026-03": { "0": "2026-04-17", "1": "2026-04-20", "2-3": "2026-04-21", "4-5": "2026-04-22", "6-7": "2026-04-23", "8-9": "2026-04-24", buenos_contribuyentes: "2026-04-27" },
  "2026-04": { "0": "2026-05-18", "1": "2026-05-19", "2-3": "2026-05-20", "4-5": "2026-05-21", "6-7": "2026-05-22", "8-9": "2026-05-25", buenos_contribuyentes: "2026-05-26" },
  "2026-05": { "0": "2026-06-15", "1": "2026-06-16", "2-3": "2026-06-17", "4-5": "2026-06-18", "6-7": "2026-06-19", "8-9": "2026-06-22", buenos_contribuyentes: "2026-06-23" },
  "2026-06": { "0": "2026-07-15", "1": "2026-07-16", "2-3": "2026-07-17", "4-5": "2026-07-20", "6-7": "2026-07-21", "8-9": "2026-07-22", buenos_contribuyentes: "2026-07-24" },
  "2026-07": { "0": "2026-08-18", "1": "2026-08-19", "2-3": "2026-08-20", "4-5": "2026-08-21", "6-7": "2026-08-24", "8-9": "2026-08-25", buenos_contribuyentes: "2026-08-26" },
  "2026-08": { "0": "2026-09-15", "1": "2026-09-16", "2-3": "2026-09-17", "4-5": "2026-09-18", "6-7": "2026-09-21", "8-9": "2026-09-22", buenos_contribuyentes: "2026-09-23" },
  "2026-09": { "0": "2026-10-16", "1": "2026-10-19", "2-3": "2026-10-20", "4-5": "2026-10-21", "6-7": "2026-10-22", "8-9": "2026-10-23", buenos_contribuyentes: "2026-10-26" },
  "2026-10": { "0": "2026-11-16", "1": "2026-11-17", "2-3": "2026-11-18", "4-5": "2026-11-19", "6-7": "2026-11-20", "8-9": "2026-11-23", buenos_contribuyentes: "2026-11-24" },
  "2026-11": { "0": "2026-12-17", "1": "2026-12-18", "2-3": "2026-12-21", "4-5": "2026-12-22", "6-7": "2026-12-23", "8-9": "2026-12-24", buenos_contribuyentes: "2026-12-28" },
  "2026-12": { "0": "2027-01-18", "1": "2027-01-19", "2-3": "2027-01-20", "4-5": "2027-01-21", "6-7": "2027-01-22", "8-9": "2027-01-25", buenos_contribuyentes: "2027-01-26" },
};

function grupoRuc(ruc: string): GrupoRuc {
  const d = ruc.slice(-1);
  if (d === "0") return "0";
  if (d === "1") return "1";
  if (d === "2" || d === "3") return "2-3";
  if (d === "4" || d === "5") return "4-5";
  if (d === "6" || d === "7") return "6-7";
  return "8-9";
}

// Próxima obligación mensual (IGV-Renta) pendiente de declarar, según la
// fecha de hoy y el RUC. SUNAT declara "periodos vencidos": en el mes X
// declaras lo del mes X-1. Devuelve null si el cronograma cargado (solo
// 2026 por ahora) no cubre el período que tocaría.
export function proximoVencimiento(hoy: Date, ruc: string) {
  const periodoAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const periodo = `${periodoAnterior.getFullYear()}-${String(periodoAnterior.getMonth() + 1).padStart(2, "0")}`;
  const fila = CRONOGRAMA_2026[periodo];
  if (!fila) return null;

  const fecha = fila[grupoRuc(ruc)];
  return { periodo, fecha, vencido: fecha < hoy.toISOString().slice(0, 10) };
}

export function nombrePeriodo(periodo: string): string {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const [y, m] = periodo.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

// Estimado informativo de IGV y pago a cuenta de Renta del mes — nunca se
// envía a SUNAT, es solo para que sepas cuánto esperar antes de declarar.
export function calcularEstimadoMensual({
  ingresosNetos,
  igvVentas,
  igvComprasCreditoFiscal,
  regimen,
}: {
  ingresosNetos: number;
  igvVentas: number;
  igvComprasCreditoFiscal: number;
  regimen: RegimenRenta;
}) {
  const tasaRenta = regimen === "mype_tributario" ? 0.01 : 0.015;
  const pagoACuentaRenta = Math.max(0, Math.round(ingresosNetos * tasaRenta * 100) / 100);
  const igvAPagar = Math.round((igvVentas - igvComprasCreditoFiscal) * 100) / 100;
  const totalEstimado = pagoACuentaRenta + Math.max(0, igvAPagar);

  return { tasaRenta, pagoACuentaRenta, igvAPagar, totalEstimado };
}
