import { describe, expect, it } from "vitest";
import { getSunatDeadline, grupoRuc, nombrePeriodo, tieneCronograma } from "./sunatCalendar";

describe("grupoRuc", () => {
  it("agrupa por el último dígito del RUC", () => {
    expect(grupoRuc("20616354664")).toBe("4-5"); // termina en 4
    expect(grupoRuc("20123456786")).toBe("6-7");
    expect(grupoRuc("20123456780")).toBe("0");
    expect(grupoRuc("20123456781")).toBe("1");
  });
});

describe("getSunatDeadline — RUC terminado en 6/7, valores de referencia oficiales", () => {
  it("período agosto 2026: SIRE 18/09/2026, FV621 21/09/2026", () => {
    expect(getSunatDeadline("2026-08", "20999999996", "sire")).toBe("2026-09-18");
    expect(getSunatDeadline("2026-08", "20999999996", "fv621")).toBe("2026-09-21");
  });

  it("período setiembre 2026: SIRE 21/10/2026, FV621 22/10/2026", () => {
    expect(getSunatDeadline("2026-09", "20999999996", "sire")).toBe("2026-10-21");
    expect(getSunatDeadline("2026-09", "20999999996", "fv621")).toBe("2026-10-22");
  });
});

describe("getSunatDeadline — RUC real de Nexa Consulting (termina en 4, grupo 4-5)", () => {
  it("período agosto 2026: FV621 18/09/2026", () => {
    expect(getSunatDeadline("2026-08", "20616354664", "fv621")).toBe("2026-09-18");
  });
});

describe("getSunatDeadline — cambio de año", () => {
  it("período diciembre 2026 vence en enero 2027", () => {
    const fecha = getSunatDeadline("2026-12", "20616354664", "fv621");
    expect(fecha).not.toBeNull();
    expect(fecha!.startsWith("2027-01")).toBe(true);
  });
});

describe("getSunatDeadline — año no cargado", () => {
  it("devuelve null para un año sin cronograma publicado", () => {
    expect(getSunatDeadline("2028-01", "20616354664", "fv621")).toBeNull();
  });
});

describe("nombrePeriodo", () => {
  it("formatea el período como texto legible", () => {
    expect(nombrePeriodo("2026-09")).toBe("Setiembre 2026");
  });
});

describe("tieneCronograma (año sin calendario)", () => {
  it("true para un año ya cargado", () => {
    expect(tieneCronograma("2026")).toBe(true);
  });

  it("false para un año que SUNAT todavía no publicó — nunca se inventan fechas", () => {
    expect(tieneCronograma("2027")).toBe(false);
    expect(tieneCronograma("2028")).toBe(false);
  });
});
