// Cronogramas oficiales de SUNAT, agrupados por año, período tributario,
// tipo de obligación (SIRE vs. FV 621) y último dígito del RUC.
//
// Son DOS obligaciones distintas con fechas distintas:
// - "sire": atraso máximo del Registro de Ventas e Ingresos y Registro de
//   Compras electrónico (SIRE). Fuente: cronograma de atraso de registros
//   electrónicos publicado por SUNAT.
// - "fv621": vencimiento de la declaración y pago mensual de IGV-Renta
//   (Formulario Virtual 621). Fuente: cronograma de obligaciones mensuales
//   publicado por SUNAT.
//
// En ambos casos la fila corresponde al período que se declara (p.ej. la
// fila "2026-08" trae las fechas de vencimiento de AGOSTO 2026, que caen en
// septiembre — SUNAT siempre declara "mes vencido").
//
// SUNAT publica un cronograma nuevo cada año — agregar el año 2027 aquí
// cuando SUNAT lo publique (fin de 2026), sin tocar el resto del código.

import type { ObligacionSunatTipo } from "./types";

export type GrupoRuc = "0" | "1" | "2-3" | "4-5" | "6-7" | "8-9" | "buenos_contribuyentes";

type FilaCronograma = Record<GrupoRuc, string>;
type CronogramaPorTipo = Record<ObligacionSunatTipo, FilaCronograma>;

// Fuente: https://www.sunat.gob.pe/orientacion/cronogramas/2026/cObligacionMensual2026.html
// y https://www.sunat.gob.pe/orientacion/cronogramas/cronoRegistroC-V-2026.html
const CRONOGRAMA_2026: Record<string, CronogramaPorTipo> = {
  "2026-01": {
    fv621: { "0": "2026-02-16", "1": "2026-02-17", "2-3": "2026-02-18", "4-5": "2026-02-19", "6-7": "2026-02-20", "8-9": "2026-02-23", buenos_contribuyentes: "2026-02-24" },
    sire: { "0": "2026-02-13", "1": "2026-02-16", "2-3": "2026-02-17", "4-5": "2026-02-18", "6-7": "2026-02-19", "8-9": "2026-02-20", buenos_contribuyentes: "2026-02-23" },
  },
  "2026-02": {
    fv621: { "0": "2026-03-16", "1": "2026-03-17", "2-3": "2026-03-18", "4-5": "2026-03-19", "6-7": "2026-03-20", "8-9": "2026-03-23", buenos_contribuyentes: "2026-03-24" },
    sire: { "0": "2026-03-13", "1": "2026-03-16", "2-3": "2026-03-17", "4-5": "2026-03-18", "6-7": "2026-03-19", "8-9": "2026-03-20", buenos_contribuyentes: "2026-03-23" },
  },
  "2026-03": {
    fv621: { "0": "2026-04-17", "1": "2026-04-20", "2-3": "2026-04-21", "4-5": "2026-04-22", "6-7": "2026-04-23", "8-9": "2026-04-24", buenos_contribuyentes: "2026-04-27" },
    sire: { "0": "2026-04-16", "1": "2026-04-17", "2-3": "2026-04-20", "4-5": "2026-04-21", "6-7": "2026-04-22", "8-9": "2026-04-23", buenos_contribuyentes: "2026-04-24" },
  },
  "2026-04": {
    fv621: { "0": "2026-05-18", "1": "2026-05-19", "2-3": "2026-05-20", "4-5": "2026-05-21", "6-7": "2026-05-22", "8-9": "2026-05-25", buenos_contribuyentes: "2026-05-26" },
    sire: { "0": "2026-05-15", "1": "2026-05-18", "2-3": "2026-05-19", "4-5": "2026-05-20", "6-7": "2026-05-21", "8-9": "2026-05-22", buenos_contribuyentes: "2026-05-25" },
  },
  "2026-05": {
    fv621: { "0": "2026-06-15", "1": "2026-06-16", "2-3": "2026-06-17", "4-5": "2026-06-18", "6-7": "2026-06-19", "8-9": "2026-06-22", buenos_contribuyentes: "2026-06-23" },
    sire: { "0": "2026-06-12", "1": "2026-06-15", "2-3": "2026-06-16", "4-5": "2026-06-17", "6-7": "2026-06-18", "8-9": "2026-06-19", buenos_contribuyentes: "2026-06-22" },
  },
  "2026-06": {
    fv621: { "0": "2026-07-15", "1": "2026-07-16", "2-3": "2026-07-17", "4-5": "2026-07-20", "6-7": "2026-07-21", "8-9": "2026-07-22", buenos_contribuyentes: "2026-07-24" },
    sire: { "0": "2026-07-14", "1": "2026-07-15", "2-3": "2026-07-16", "4-5": "2026-07-17", "6-7": "2026-07-20", "8-9": "2026-07-21", buenos_contribuyentes: "2026-07-22" },
  },
  "2026-07": {
    fv621: { "0": "2026-08-18", "1": "2026-08-19", "2-3": "2026-08-20", "4-5": "2026-08-21", "6-7": "2026-08-24", "8-9": "2026-08-25", buenos_contribuyentes: "2026-08-26" },
    sire: { "0": "2026-08-17", "1": "2026-08-18", "2-3": "2026-08-19", "4-5": "2026-08-20", "6-7": "2026-08-21", "8-9": "2026-08-24", buenos_contribuyentes: "2026-08-25" },
  },
  "2026-08": {
    fv621: { "0": "2026-09-15", "1": "2026-09-16", "2-3": "2026-09-17", "4-5": "2026-09-18", "6-7": "2026-09-21", "8-9": "2026-09-22", buenos_contribuyentes: "2026-09-23" },
    sire: { "0": "2026-09-14", "1": "2026-09-15", "2-3": "2026-09-16", "4-5": "2026-09-17", "6-7": "2026-09-18", "8-9": "2026-09-21", buenos_contribuyentes: "2026-09-22" },
  },
  "2026-09": {
    fv621: { "0": "2026-10-16", "1": "2026-10-19", "2-3": "2026-10-20", "4-5": "2026-10-21", "6-7": "2026-10-22", "8-9": "2026-10-23", buenos_contribuyentes: "2026-10-26" },
    sire: { "0": "2026-10-15", "1": "2026-10-16", "2-3": "2026-10-19", "4-5": "2026-10-20", "6-7": "2026-10-21", "8-9": "2026-10-22", buenos_contribuyentes: "2026-10-23" },
  },
  "2026-10": {
    fv621: { "0": "2026-11-16", "1": "2026-11-17", "2-3": "2026-11-18", "4-5": "2026-11-19", "6-7": "2026-11-20", "8-9": "2026-11-23", buenos_contribuyentes: "2026-11-24" },
    sire: { "0": "2026-11-13", "1": "2026-11-16", "2-3": "2026-11-17", "4-5": "2026-11-18", "6-7": "2026-11-19", "8-9": "2026-11-20", buenos_contribuyentes: "2026-11-23" },
  },
  "2026-11": {
    fv621: { "0": "2026-12-17", "1": "2026-12-18", "2-3": "2026-12-21", "4-5": "2026-12-22", "6-7": "2026-12-23", "8-9": "2026-12-24", buenos_contribuyentes: "2026-12-28" },
    sire: { "0": "2026-12-16", "1": "2026-12-17", "2-3": "2026-12-18", "4-5": "2026-12-21", "6-7": "2026-12-22", "8-9": "2026-12-23", buenos_contribuyentes: "2026-12-24" },
  },
  "2026-12": {
    fv621: { "0": "2027-01-18", "1": "2027-01-19", "2-3": "2027-01-20", "4-5": "2027-01-21", "6-7": "2027-01-22", "8-9": "2027-01-25", buenos_contribuyentes: "2027-01-26" },
    sire: { "0": "2027-01-15", "1": "2027-01-18", "2-3": "2027-01-19", "4-5": "2027-01-20", "6-7": "2027-01-21", "8-9": "2027-01-22", buenos_contribuyentes: "2027-01-25" },
  },
};

// año -> cronograma. Agregar "2027": { ... } aquí cuando SUNAT lo publique.
const CRONOGRAMAS: Record<string, Record<string, CronogramaPorTipo>> = {
  "2026": CRONOGRAMA_2026,
};

export function grupoRuc(ruc: string): GrupoRuc {
  const d = ruc.slice(-1);
  if (d === "0") return "0";
  if (d === "1") return "1";
  if (d === "2" || d === "3") return "2-3";
  if (d === "4" || d === "5") return "4-5";
  if (d === "6" || d === "7") return "6-7";
  return "8-9";
}

// Fecha límite (YYYY-MM-DD) para un período tributario ("YYYY-MM"), tipo de
// obligación y RUC dados. Devuelve null si el cronograma del año todavía no
// está cargado (años futuros no publicados por SUNAT).
export function getSunatDeadline(periodo: string, ruc: string, tipo: ObligacionSunatTipo): string | null {
  const anio = periodo.slice(0, 4);
  const fila = CRONOGRAMAS[anio]?.[periodo];
  if (!fila) return null;
  return fila[tipo][grupoRuc(ruc)];
}

// true si SUNAT ya publicó (y Nexa Core ya cargó) el cronograma de ese
// año. Se usa para mostrar "Calendario SUNAT aún no configurado para este
// año" en vez de inventar fechas.
export function tieneCronograma(anio: string): boolean {
  return anio in CRONOGRAMAS;
}

export function nombrePeriodo(periodo: string): string {
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const [y, m] = periodo.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}
