import { describe, expect, it } from "vitest";
import {
  buildEstimadoPeriodo,
  calculateCollectionsAfterTaxReserve,
  calculateInputTaxCredit,
  calculateRMTPayment,
  calculateSalesVAT,
  calculateTaxableBase,
  calculateTaxReserve,
  calculateVATFromBase,
  calculateVATPayable,
  classifyPeriod,
  compareEstimadoVsDeclarado,
  getPeriodsForYear,
  getRentaRate,
  getTaxObligationStatus,
  getTaxPeriod,
} from "./taxService";
import type { Gasto } from "./types";

describe("calculateTaxableBase / calculateSalesVAT (total con IGV incluido)", () => {
  it("S/118 incluido IGV -> base 100, IGV 18", () => {
    expect(calculateTaxableBase(118)).toBeCloseTo(100, 2);
    expect(calculateSalesVAT(118)).toBeCloseTo(18, 2);
  });

  it("S/24 incluido IGV -> base ≈ 20.34, IGV ≈ 3.66", () => {
    expect(calculateTaxableBase(24)).toBeCloseTo(20.34, 2);
    expect(calculateSalesVAT(24)).toBeCloseTo(3.66, 2);
  });

  it("base + IGV siempre reconstruye el total original", () => {
    for (const total of [24, 100, 118, 0.01, 999.99]) {
      const base = calculateTaxableBase(total);
      const igv = calculateSalesVAT(total);
      expect(Math.round((base + igv) * 100) / 100).toBeCloseTo(total, 2);
    }
  });
});

describe("calculateVATFromBase (base sin IGV -> IGV hacia adelante)", () => {
  it("base 100 -> IGV 18", () => {
    expect(calculateVATFromBase(100)).toBeCloseTo(18, 2);
  });

  it("base 20.34 -> IGV ≈ 3.66 (consistente con calculateSalesVAT del total)", () => {
    expect(calculateVATFromBase(20.34)).toBeCloseTo(3.66, 2);
  });
});

describe("calculateRMTPayment (pago a cuenta Renta 1% MYPE)", () => {
  it("sobre la base S/20.34, NO sobre el total S/24 con IGV incluido", () => {
    const renta = calculateRMTPayment(20.34, "mype_tributario");
    expect(renta).toBeCloseTo(0.2, 2);
    expect(renta).not.toBeCloseTo(24 * 0.01, 2); // el bug original: 0.24
  });

  it("caso real del panel: venta de S/24 incluido IGV, sin crédito fiscal", () => {
    const base = calculateTaxableBase(24); // 20.34
    const igv = calculateSalesVAT(24); // 3.66
    const renta = calculateRMTPayment(base, "mype_tributario");
    expect(base).toBeCloseTo(20.34, 2);
    expect(igv).toBeCloseTo(3.66, 2);
    expect(renta).toBeCloseTo(0.2, 2);
    const { igvPorPagar } = calculateVATPayable(igv, 0);
    expect(Math.round((igvPorPagar + renta) * 100) / 100).toBeCloseTo(3.86, 2);
  });

  it("cero ingresos -> renta 0", () => {
    expect(calculateRMTPayment(0, "mype_tributario")).toBe(0);
  });

  it("régimen general usa 1.5%", () => {
    expect(calculateRMTPayment(100, "general")).toBeCloseTo(1.5, 2);
  });
});

describe("calculateInputTaxCredit (crédito fiscal de compras)", () => {
  const gasto = (overrides: Partial<Gasto>): Gasto => ({
    id: "x",
    fecha: "2026-09-01",
    concepto: "gasto",
    proveedor: null,
    categoria: "otros",
    frecuencia: "unico",
    monto: 118,
    igv: 18,
    credito_fiscal: true,
    anulado: false,
    medio_pago: null,
    url_adjunto: null,
    notas: null,
    created_by: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  });

  it("cero gastos -> 0", () => {
    expect(calculateInputTaxCredit([])).toBe(0);
  });

  it("suma solo los gastos marcados con crédito fiscal", () => {
    const gastos = [gasto({ igv: 18, credito_fiscal: true }), gasto({ igv: 5, credito_fiscal: false })];
    expect(calculateInputTaxCredit(gastos)).toBeCloseTo(18, 2);
  });

  it("descarta gastos anulados aunque tengan crédito fiscal", () => {
    const gastos = [gasto({ igv: 18, credito_fiscal: true, anulado: true })];
    expect(calculateInputTaxCredit(gastos)).toBe(0);
  });

  it("múltiples compras con crédito fiscal se suman", () => {
    const gastos = [
      gasto({ igv: 18, credito_fiscal: true }),
      gasto({ igv: 3.66, credito_fiscal: true }),
      gasto({ igv: 10, credito_fiscal: true }),
    ];
    expect(calculateInputTaxCredit(gastos)).toBeCloseTo(31.66, 2);
  });
});

describe("calculateVATPayable (IGV ventas - crédito fiscal)", () => {
  it("ejemplo del enunciado: 100 - 40 = 60 por pagar", () => {
    expect(calculateVATPayable(100, 40)).toEqual({ igvPorPagar: 60, saldoFavor: 0 });
  });

  it("cero ventas y cero compras -> 0 por pagar", () => {
    expect(calculateVATPayable(0, 0)).toEqual({ igvPorPagar: 0, saldoFavor: 0 });
  });

  it("crédito fiscal mayor al IGV de ventas -> no se muestra como deuda negativa", () => {
    const { igvPorPagar, saldoFavor } = calculateVATPayable(40, 100);
    expect(igvPorPagar).toBe(0);
    expect(saldoFavor).toBeCloseTo(60, 2);
  });
});

describe("calculateTaxReserve (IGV por pagar + Renta, reserva total)", () => {
  it("suma ambos conceptos", () => {
    expect(calculateTaxReserve(3.66, 0.2)).toBeCloseTo(3.86, 2);
  });

  it("cero + cero = cero", () => {
    expect(calculateTaxReserve(0, 0)).toBe(0);
  });

  it("evita drift de punto flotante en sumas de centavos", () => {
    expect(calculateTaxReserve(0.1, 0.2)).toBeCloseTo(0.3, 2);
  });
});

describe("calculateCollectionsAfterTaxReserve (cobros del mes después de reserva tributaria)", () => {
  it("cobrado > reserva: disponible es la diferencia, sin reserva pendiente", () => {
    expect(calculateCollectionsAfterTaxReserve(24, 3.86)).toEqual({ disponible: 20.14, reservaPendiente: 0 });
  });

  it("cobrado = reserva: disponible en 0, sin reserva pendiente", () => {
    expect(calculateCollectionsAfterTaxReserve(3.86, 3.86)).toEqual({ disponible: 0, reservaPendiente: 0 });
  });

  it("cobrado < reserva: NO da negativo, se informa como reserva pendiente de cubrir", () => {
    expect(calculateCollectionsAfterTaxReserve(2, 3.86)).toEqual({ disponible: 0, reservaPendiente: 1.86 });
  });

  it("cobrado = 0: todo la reserva queda pendiente de cubrir (ejemplo del enunciado)", () => {
    expect(calculateCollectionsAfterTaxReserve(0, 3.86)).toEqual({ disponible: 0, reservaPendiente: 3.86 });
  });

  it("reserva = 0: lo cobrado queda disponible completo", () => {
    expect(calculateCollectionsAfterTaxReserve(100, 0)).toEqual({ disponible: 100, reservaPendiente: 0 });
  });

  it("cobrado = 0 y reserva = 0: ambos en cero", () => {
    expect(calculateCollectionsAfterTaxReserve(0, 0)).toEqual({ disponible: 0, reservaPendiente: 0 });
  });
});

describe("getTaxPeriod", () => {
  it("agrupa por mes de la fecha de emisión", () => {
    expect(getTaxPeriod("2026-09-11")).toBe("2026-09");
  });

  it("distingue movimientos de meses distintos", () => {
    expect(getTaxPeriod("2026-08-31")).toBe("2026-08");
    expect(getTaxPeriod("2026-09-01")).toBe("2026-09");
  });

  it("cambia de año correctamente", () => {
    expect(getTaxPeriod("2026-12-31")).toBe("2026-12");
    expect(getTaxPeriod("2027-01-01")).toBe("2027-01");
  });
});

describe("getTaxObligationStatus", () => {
  const hoy = new Date("2026-09-16T12:00:00Z");

  it("más de 7 días -> normal", () => {
    expect(getTaxObligationStatus("2026-10-22", hoy, false).estado).toBe("normal");
  });

  it("7 días o menos -> proximo", () => {
    expect(getTaxObligationStatus("2026-09-23", hoy, false).estado).toBe("proximo");
  });

  it("3 días o menos -> urgente", () => {
    expect(getTaxObligationStatus("2026-09-18", hoy, false).estado).toBe("urgente");
  });

  it("fecha pasada -> vencido", () => {
    expect(getTaxObligationStatus("2026-09-10", hoy, false).estado).toBe("vencido");
  });

  it("obligación pendiente pero ya marcada como cumplida -> cumplido, incluso vencida", () => {
    expect(getTaxObligationStatus("2026-09-10", hoy, true).estado).toBe("cumplido");
  });

  it("obligación declarada/pagada no se marca sola: requiere yaCumplido explícito", () => {
    expect(getTaxObligationStatus("2026-09-18", hoy, false).estado).not.toBe("cumplido");
  });
});

describe("getPeriodsForYear (generación de períodos)", () => {
  it("genera los 12 períodos del año, en orden", () => {
    expect(getPeriodsForYear("2026")).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
      "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
  });

  it("funciona para cualquier año, sin hardcodear 2026", () => {
    const periodos = getPeriodsForYear("2030");
    expect(periodos[0]).toBe("2030-01");
    expect(periodos[11]).toBe("2030-12");
    expect(periodos).toHaveLength(12);
  });
});

describe("classifyPeriod", () => {
  const hoy = new Date("2026-09-16T12:00:00Z");

  it("período pasado (ya cerrado)", () => {
    expect(classifyPeriod("2026-08", hoy)).toBe("pasado");
    expect(classifyPeriod("2025-12", hoy)).toBe("pasado");
  });

  it("período actual -> en_curso", () => {
    expect(classifyPeriod("2026-09", hoy)).toBe("en_curso");
  });

  it("período futuro", () => {
    expect(classifyPeriod("2026-10", hoy)).toBe("futuro");
    expect(classifyPeriod("2027-01", hoy)).toBe("futuro");
  });
});

describe("getRentaRate", () => {
  it("1% en MYPE Tributario, 1.5% en Régimen General", () => {
    expect(getRentaRate("mype_tributario")).toBe(0.01);
    expect(getRentaRate("general")).toBe(0.015);
  });
});

describe("buildEstimadoPeriodo", () => {
  const gasto = (igv: number, creditoFiscal: boolean, anulado = false) => ({
    igv,
    credito_fiscal: creditoFiscal,
    anulado,
  });

  it("agrega ventas, base, IGV y crédito fiscal del período dado", () => {
    const estimado = buildEstimadoPeriodo(
      [
        { subtotal: 20.34, igv: 3.66, total: 24 },
        { subtotal: 100, igv: 18, total: 118 },
      ],
      [gasto(18, true), gasto(5, false)],
      "mype_tributario",
    );
    expect(estimado.ventasFacturadas).toBeCloseTo(142, 2);
    expect(estimado.baseImponible).toBeCloseTo(120.34, 2);
    expect(estimado.igvVentas).toBeCloseTo(21.66, 2);
    expect(estimado.creditoFiscal).toBeCloseTo(18, 2);
    expect(estimado.igvPorPagar).toBeCloseTo(3.66, 2);
    expect(estimado.pagoACuentaRenta).toBeCloseTo(1.2, 2);
    expect(estimado.reservaTributaria).toBeCloseTo(4.86, 2);
  });

  it("período sin movimientos -> todo en cero", () => {
    const estimado = buildEstimadoPeriodo([], [], "mype_tributario");
    expect(estimado).toEqual({
      ventasFacturadas: 0,
      baseImponible: 0,
      igvVentas: 0,
      creditoFiscal: 0,
      igvPorPagar: 0,
      saldoFavor: 0,
      pagoACuentaRenta: 0,
      reservaTributaria: 0,
    });
  });
});

describe("compareEstimadoVsDeclarado (estimado vs. real)", () => {
  it("sin nada declarado todavía -> null (no compara con datos incompletos)", () => {
    expect(compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, { igv: null, renta: null, total: null })).toBeNull();
  });

  it("declarado parcial (falta un monto) -> también null", () => {
    expect(
      compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, { igv: 3.5, renta: null, total: 3.7 }),
    ).toBeNull();
  });

  it("diferencia cero: estimado y declarado coinciden exacto", () => {
    const cmp = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, { igv: 3.66, renta: 0.2, total: 3.86 });
    expect(cmp).not.toBeNull();
    expect(cmp!.diferenciaIgv).toBe(0);
    expect(cmp!.diferenciaRenta).toBe(0);
    expect(cmp!.diferenciaTotal).toBe(0);
  });

  it("diferencia negativa: se declaró menos de lo estimado (ejemplo del enunciado)", () => {
    const cmp = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, { igv: 3.5, renta: 0.2, total: 3.7 });
    expect(cmp).not.toBeNull();
    expect(cmp!.estimadoTotal).toBeCloseTo(3.86, 2);
    expect(cmp!.declaradoTotal).toBeCloseTo(3.7, 2);
    expect(cmp!.diferenciaTotal).toBeCloseTo(-0.16, 2);
  });

  it("diferencia positiva: se declaró más de lo estimado", () => {
    const cmp = compareEstimadoVsDeclarado({ igv: 3, renta: 0 }, { igv: 3.5, renta: 0.1, total: 3.6 });
    expect(cmp).not.toBeNull();
    expect(cmp!.diferenciaIgv).toBeCloseTo(0.5, 2);
    expect(cmp!.diferenciaRenta).toBeCloseTo(0.1, 2);
    expect(cmp!.diferenciaTotal).toBeCloseTo(0.6, 2);
  });

  it("usa total_declarado tal cual, NO recalcula sumando IGV + Renta declarados", () => {
    // SUNAT puede determinar un total distinto a la simple suma — la
    // comparación debe respetar lo que el admin registró como total
    // declarado, no reinventarlo.
    const cmp = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, { igv: 3.5, renta: 0.2, total: 3.75 });
    expect(cmp).not.toBeNull();
    expect(cmp!.declaradoTotal).toBe(3.75); // no 3.70 (= 3.5 + 0.2)
    expect(cmp!.diferenciaTotal).toBeCloseTo(-0.11, 2); // 3.75 - 3.86
  });

  it("FV621 declarado pero no pagado: la comparación no depende del pago (no recibe total_pagado)", () => {
    // El pago es un hecho aparte que no participa de esta comparación —
    // por diseño la función ni siquiera tiene un parámetro de pago.
    const declaradoSinPagar = { igv: 3.66, renta: 0.2, total: 3.7 };
    const cmp = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, declaradoSinPagar);
    expect(cmp).not.toBeNull();
    expect(cmp!.declaradoTotal).toBeCloseTo(3.7, 2);
  });

  it("FV621 declarado y luego pagado: mismo resultado que declarado-sin-pagar (el pago no cambia la comparación)", () => {
    const declarado = { igv: 3.66, renta: 0.2, total: 3.7 };
    const cmpAntesDePagar = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, declarado);
    const cmpDespuesDePagar = compareEstimadoVsDeclarado({ igv: 3.66, renta: 0.2 }, declarado);
    expect(cmpDespuesDePagar).toEqual(cmpAntesDePagar);
  });
});
