// Lógica tributaria pura (sin JSX, sin llamadas a Supabase) para el
// estimado de IGV y el pago a cuenta de Renta del Régimen MYPE Tributario.
// Todo lo de acá es INFORMATIVO: nunca se envía a SUNAT ni reemplaza la
// declaración real — ver el disclaimer que se muestra junto al estimado en
// el Panel.
//
// Los montos se manejan en céntimos (enteros) durante el cálculo para
// evitar los errores de redondeo típicos de la aritmética de punto
// flotante en JS (0.1 + 0.2 !== 0.3), y se devuelven en soles redondeados
// a 2 decimales, igual que el resto de la app (numeric(12,2) en la BD).

import type { Gasto, RegimenRenta } from "./types";

export const IGV_TASA = 0.18;

function toCentavos(soles: number): number {
  return Math.round(soles * 100);
}

function toSoles(centavos: number): number {
  return Math.round(centavos) / 100;
}

// Dado un monto que YA incluye IGV (p.ej. el total cobrado de una boleta),
// separa el valor de venta (base imponible) sin IGV.
//
// Ejemplo: 24.00 incluido IGV -> 20.34 (24 / 1.18, redondeado a centavos).
export function calculateTaxableBase(totalConIgv: number): number {
  const totalCentavos = toCentavos(totalConIgv);
  const baseCentavos = Math.round(totalCentavos / (1 + IGV_TASA));
  return toSoles(baseCentavos);
}

// Dado un monto que YA incluye IGV, calcula el IGV como la diferencia
// entre el total y la base (nunca total * 18%, porque el total ya trae el
// IGV adentro).
//
// Ejemplo: 24.00 incluido IGV -> base 20.34, IGV 24.00 - 20.34 = 3.66.
export function calculateSalesVAT(totalConIgv: number): number {
  const totalCentavos = toCentavos(totalConIgv);
  const baseCentavos = Math.round(totalCentavos / (1 + IGV_TASA));
  return toSoles(totalCentavos - baseCentavos);
}

// Caso inverso: dado un valor de venta SIN IGV (como el campo "subtotal"
// que se ingresa al registrar un comprobante en Nexa Core), calcula el IGV
// hacia adelante. Ejemplo: base 100 -> IGV 18.00.
export function calculateVATFromBase(baseImponible: number): number {
  return toSoles(Math.round(toCentavos(baseImponible) * IGV_TASA));
}

// Suma el IGV de los gastos marcados explícitamente con derecho a crédito
// fiscal (nunca asume que cualquier gasto da ese derecho, y descarta los
// anulados).
export function calculateInputTaxCredit(gastos: Pick<Gasto, "igv" | "credito_fiscal" | "anulado">[]): number {
  const centavos = gastos
    .filter((g) => g.credito_fiscal && !g.anulado)
    .reduce((acc, g) => acc + toCentavos(g.igv), 0);
  return toSoles(centavos);
}

// IGV de ventas menos crédito fiscal de compras. Si el resultado es
// negativo (más crédito que IGV de ventas), no se muestra como una deuda:
// el IGV por pagar queda en 0 y el excedente se informa como saldo a favor.
export function calculateVATPayable(
  igvVentas: number,
  creditoFiscal: number,
): { igvPorPagar: number; saldoFavor: number } {
  const diferenciaCentavos = toCentavos(igvVentas) - toCentavos(creditoFiscal);
  if (diferenciaCentavos >= 0) {
    return { igvPorPagar: toSoles(diferenciaCentavos), saldoFavor: 0 };
  }
  return { igvPorPagar: 0, saldoFavor: toSoles(-diferenciaCentavos) };
}

// Tasa del pago a cuenta de Renta según régimen: 1% en MYPE Tributario
// (mientras no se superen las 300 UIT anuales de ingresos), 1.5% en
// Régimen General. Se expone aparte de calculateRMTPayment para que la UI
// pueda mostrar el porcentaje (p.ej. "Renta (1.0%)") sin repetir el
// ternario en cada pantalla.
export function getRentaRate(regimen: RegimenRenta): number {
  return regimen === "mype_tributario" ? 0.01 : 0.015;
}

// Pago a cuenta de Renta: tasa de getRentaRate() sobre los ingresos netos
// del mes. IMPORTANTE: se aplica sobre la base imponible (valor de venta,
// sin IGV) — nunca sobre el total cobrado con IGV incluido.
export function calculateRMTPayment(ingresosNetosBase: number, regimen: RegimenRenta): number {
  const centavos = Math.round(toCentavos(ingresosNetosBase) * getRentaRate(regimen));
  return toSoles(Math.max(0, centavos));
}

// Suma el IGV por pagar y el pago a cuenta de Renta en una sola cifra "a
// reservar" — el estimado de carga tributaria total de un período (SUNAT ya
// declarable, o la proyección del mes en curso). Es la misma cuenta en
// ambos casos, factorizada acá para no repetir el redondeo en céntimos.
export function calculateTaxReserve(igvPorPagar: number, pagoACuentaRenta: number): number {
  return toSoles(toCentavos(igvPorPagar) + toCentavos(pagoACuentaRenta));
}

// Cobros del mes después de separar la reserva tributaria estimada.
// IMPORTANTE: esto NO es "caja disponible" ni el saldo de bancos/caja de la
// empresa — solo mide lo cobrado ESTE mes contra lo que habría que
// reservar de esos cobros. Una empresa puede tener saldo acumulado de
// meses anteriores que esta cifra no ve. PURAMENTE INFORMATIVO: no
// modifica el saldo bancario real, no genera un gasto contable, no genera
// una declaración SUNAT y no debe interpretarse como un pago ya hecho.
//
// Nunca se devuelve un "disponible" negativo (no es caja negativa, es
// reserva sin cubrir todavía): si lo cobrado no alcanza para la reserva,
// "disponible" queda en 0 y el faltante se informa aparte como
// "reservaPendiente".
export function calculateCollectionsAfterTaxReserve(
  cobradoMes: number,
  reservaTributaria: number,
): { disponible: number; reservaPendiente: number } {
  const diferenciaCentavos = toCentavos(cobradoMes) - toCentavos(reservaTributaria);
  if (diferenciaCentavos >= 0) {
    return { disponible: toSoles(diferenciaCentavos), reservaPendiente: 0 };
  }
  return { disponible: 0, reservaPendiente: toSoles(-diferenciaCentavos) };
}

// Período tributario ("YYYY-MM") al que corresponde una fecha de emisión.
// Un comprobante emitido el 11/09/2026 cae en el período 09/2026 — eso NO
// significa que el impuesto se declare ese mismo día, solo que ese
// movimiento se agrupa con los demás de septiembre para la declaración
// que vence el mes siguiente.
export function getTaxPeriod(fechaIso: string): string {
  return fechaIso.slice(0, 7);
}

export type EstadoUrgenciaObligacion = "normal" | "proximo" | "urgente" | "vencido" | "cumplido";

// Estado visual de una obligación según qué tan cerca está su fecha límite,
// o si ya fue marcada como cumplida (presentada/declarada/pagada) a mano
// por el admin — nunca se marca como cumplida automáticamente solo porque
// exista un movimiento.
export function getTaxObligationStatus(
  fechaLimite: string,
  hoy: Date,
  yaCumplido: boolean,
): { estado: EstadoUrgenciaObligacion; diasRestantes: number } {
  const hoyIso = hoy.toISOString().slice(0, 10);
  const diasRestantes = Math.round(
    (new Date(fechaLimite).getTime() - new Date(hoyIso).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (yaCumplido) return { estado: "cumplido", diasRestantes };
  if (diasRestantes < 0) return { estado: "vencido", diasRestantes };
  if (diasRestantes <= 3) return { estado: "urgente", diasRestantes };
  if (diasRestantes <= 7) return { estado: "proximo", diasRestantes };
  return { estado: "normal", diasRestantes };
}

// --- Módulo SUNAT (/sunat): historial por período tributario -------------
// Todo lo de acá reutiliza las mismas primitivas de arriba — nada nuevo se
// inventa, solo se combinan para armar el historial año por año.

// Los 12 períodos ("YYYY-MM") de un año calendario, en orden.
export function getPeriodsForYear(anio: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`);
}

export type ClasificacionPeriodo = "pasado" | "en_curso" | "futuro";

// Un período es "pasado" (ya cerrado, con estado real consultable),
// "en_curso" (se sigue acumulando, todavía no se declara) o "futuro"
// (todavía no empieza). La comparación es lexicográfica sobre "YYYY-MM",
// que coincide con el orden cronológico.
export function classifyPeriod(periodo: string, hoy: Date): ClasificacionPeriodo {
  const mesActual = hoy.toISOString().slice(0, 7);
  if (periodo === mesActual) return "en_curso";
  if (periodo > mesActual) return "futuro";
  return "pasado";
}

export interface EstimadoPeriodo {
  ventasFacturadas: number;
  baseImponible: number;
  igvVentas: number;
  creditoFiscal: number;
  igvPorPagar: number;
  saldoFavor: number;
  pagoACuentaRenta: number;
  reservaTributaria: number;
}

// Arma el estimado tributario de un período a partir de los comprobantes y
// gastos YA FILTRADOS de ese período (no anulados). El llamador decide qué
// conjunto de movimientos corresponde a cada período — esta función solo
// agrega y aplica las mismas fórmulas de arriba.
//
// NOTA — esto es SIEMPRE dinámico: se recalcula desde los comprobantes/
// gastos actuales cada vez que se llama, para cualquier período (pasado,
// presente o futuro). Si más adelante se edita o anula un comprobante de
// un período ya declarado, el estimado que se muestre para ese período
// cambiará retroactivamente y ya no coincidirá con lo que se vio al
// momento de declarar — hoy no queda ningún registro de "cuánto estimaba
// Nexa cuando declaré".
//
// MEJORA FUTURA (no implementada, fuera de alcance de la V1):
// "Capturar snapshot del estimado al momento de realizar la primera
// declaración FV621." — la primera vez que un período pasa a estado
// 'declarado' en core_obligaciones_sunat, guardar el resultado de esta
// función en ese mismo registro (columnas aditivas nuevas, sin tabla
// aparte ni duplicar comprobantes/gastos) para tener un punto de
// comparación estable que no se mueva si los movimientos cambian después.
export function buildEstimadoPeriodo(
  comprobantesDelPeriodo: { subtotal: number; igv: number; total: number }[],
  gastosDelPeriodo: Pick<Gasto, "igv" | "credito_fiscal" | "anulado">[],
  regimen: RegimenRenta,
): EstimadoPeriodo {
  const ventasFacturadas = comprobantesDelPeriodo.reduce((s, c) => s + c.total, 0);
  const baseImponible = comprobantesDelPeriodo.reduce((s, c) => s + c.subtotal, 0);
  const igvVentas = comprobantesDelPeriodo.reduce((s, c) => s + c.igv, 0);
  const creditoFiscal = calculateInputTaxCredit(gastosDelPeriodo);
  const { igvPorPagar, saldoFavor } = calculateVATPayable(igvVentas, creditoFiscal);
  const pagoACuentaRenta = calculateRMTPayment(baseImponible, regimen);
  const reservaTributaria = calculateTaxReserve(igvPorPagar, pagoACuentaRenta);
  return {
    ventasFacturadas,
    baseImponible,
    igvVentas,
    creditoFiscal,
    igvPorPagar,
    saldoFavor,
    pagoACuentaRenta,
    reservaTributaria,
  };
}

export interface EstimadoVsDeclarado {
  estimadoIgv: number;
  estimadoRenta: number;
  estimadoTotal: number;
  declaradoIgv: number;
  declaradoRenta: number;
  declaradoTotal: number;
  diferenciaIgv: number;
  diferenciaRenta: number;
  diferenciaTotal: number;
}

// Compara el estimado calculado por Nexa Core contra lo realmente
// DECLARADO en SUNAT (registrado a mano por el admin en
// core_obligaciones_sunat). Usa el total_declarado tal como se registró —
// nunca lo recalcula sumando IGV + Renta, porque SUNAT puede determinar un
// total ligeramente distinto — y NUNCA total_pagado: el pago es un hecho
// aparte que no participa de esta comparación (un período puede estar
// declarado sin estar pagado todavía).
//
// Devuelve null mientras no se haya registrado el IGV, la Renta y el total
// declarados — la comparación no tiene sentido con datos parciales. La
// diferencia (declarado - estimado) es siempre informativa: nunca se usa
// para modificar comprobantes ni para "corregir" el estimado.
export function compareEstimadoVsDeclarado(
  estimado: { igv: number; renta: number },
  declarado: { igv: number | null; renta: number | null; total: number | null },
): EstimadoVsDeclarado | null {
  if (declarado.igv === null || declarado.renta === null || declarado.total === null) return null;

  const estimadoTotal = calculateTaxReserve(estimado.igv, estimado.renta);

  return {
    estimadoIgv: estimado.igv,
    estimadoRenta: estimado.renta,
    estimadoTotal,
    declaradoIgv: declarado.igv,
    declaradoRenta: declarado.renta,
    declaradoTotal: declarado.total,
    diferenciaIgv: toSoles(toCentavos(declarado.igv) - toCentavos(estimado.igv)),
    diferenciaRenta: toSoles(toCentavos(declarado.renta) - toCentavos(estimado.renta)),
    diferenciaTotal: toSoles(toCentavos(declarado.total) - toCentavos(estimadoTotal)),
  };
}
