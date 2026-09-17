import { describe, expect, it } from "vitest";
import { OBLIGACION_ESTADOS_POR_TIPO, obligacionCumplida, type ObligacionSunat } from "./types";

function obligacionFv621(overrides: Partial<ObligacionSunat>): ObligacionSunat {
  return {
    id: "x",
    periodo: "2026-08",
    tipo: "fv621",
    estado: "declarado",
    fecha_presentacion: null,
    fecha_pago: null,
    monto_igv: null,
    monto_renta: null,
    total_declarado: null,
    total_pagado: null,
    numero_orden: null,
    observaciones: null,
    created_by: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("estados SIRE", () => {
  it("solo admite pendiente/presentado — nunca declarado/pagado (eso es de FV621)", () => {
    expect(OBLIGACION_ESTADOS_POR_TIPO.sire).toEqual(["pendiente", "presentado"]);
  });

  it("pendiente no está cumplido; presentado sí", () => {
    expect(obligacionCumplida("pendiente")).toBe(false);
    expect(obligacionCumplida("presentado")).toBe(true);
  });
});

describe("estados FV621", () => {
  it("admite pendiente/declarado/pagado, en ese orden — declarado no implica pagado", () => {
    expect(OBLIGACION_ESTADOS_POR_TIPO.fv621).toEqual(["pendiente", "declarado", "pagado"]);
  });

  it("pendiente no está cumplido; declarado y pagado sí (aunque sean pasos distintos)", () => {
    expect(obligacionCumplida("pendiente")).toBe(false);
    expect(obligacionCumplida("declarado")).toBe(true);
    expect(obligacionCumplida("pagado")).toBe(true);
  });

  it("declarado y pagado son estados distintos entre sí, no se colapsan", () => {
    expect(OBLIGACION_ESTADOS_POR_TIPO.fv621).toContain("declarado");
    expect(OBLIGACION_ESTADOS_POR_TIPO.fv621).toContain("pagado");
    expect(OBLIGACION_ESTADOS_POR_TIPO.fv621.filter((e) => e === "declarado" || e === "pagado")).toHaveLength(2);
  });
});

describe("ObligacionSunat FV621 — total_declarado vs. total_pagado (campos independientes)", () => {
  it("declarado pero no pagado: total_pagado y fecha_pago quedan en null sin bloquear el registro", () => {
    const o = obligacionFv621({
      estado: "declarado",
      monto_igv: 3.66,
      monto_renta: 0.2,
      total_declarado: 3.86,
      fecha_presentacion: "2026-09-18",
      total_pagado: null,
      fecha_pago: null,
    });
    expect(o.estado).toBe("declarado");
    expect(o.total_declarado).toBe(3.86);
    expect(o.total_pagado).toBeNull();
    expect(o.fecha_pago).toBeNull();
  });

  it("declarado y pagado: ambos totales conviven, cada uno con su propia fecha", () => {
    const o = obligacionFv621({
      estado: "pagado",
      total_declarado: 3.86,
      fecha_presentacion: "2026-09-18",
      total_pagado: 3.86,
      fecha_pago: "2026-09-20",
    });
    expect(o.total_declarado).toBe(3.86);
    expect(o.total_pagado).toBe(3.86);
    expect(o.fecha_presentacion).not.toBe(o.fecha_pago);
  });

  it("total_declarado puede ser distinto de total_pagado sin conflicto (nunca se aliasan)", () => {
    const o = obligacionFv621({ estado: "pagado", total_declarado: 3.7, total_pagado: 3.86 });
    expect(o.total_declarado).toBe(3.7);
    expect(o.total_pagado).toBe(3.86);
    expect(o.total_declarado).not.toBe(o.total_pagado);
  });
});
