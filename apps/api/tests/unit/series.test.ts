import { describe, expect, it } from "vitest";
import { metrica, rellenarSerieDiaria, variacion } from "../../src/lib/series.js";

const hoy = new Date("2026-10-07T15:00:00Z");

describe("rellenarSerieDiaria", () => {
  it("rellena con 0 los días sin actividad y termina hoy", () => {
    const s = rellenarSerieDiaria([{ dia: "2026-10-07", n: 3 }, { dia: "2026-10-05", n: "2" }], 4, hoy);
    expect(s).toEqual([0, 2, 0, 3]); // 04, 05, 06, 07
  });

  it("acepta fechas como Date y suma filas del mismo día", () => {
    const s = rellenarSerieDiaria([{ dia: new Date("2026-10-06T00:00:00Z"), n: 1 }, { dia: "2026-10-06", n: 4 }], 2, hoy);
    expect(s).toEqual([5, 0]);
  });

  it("ignora días fuera de la ventana", () => {
    expect(rellenarSerieDiaria([{ dia: "2026-09-01", n: 9 }], 3, hoy)).toEqual([0, 0, 0]);
  });
});

describe("variacion", () => {
  it("compara la segunda mitad con la primera", () => {
    expect(variacion([1, 1, 2, 2])).toBe(100);
    expect(variacion([4, 0, 1, 1])).toBe(-50);
  });

  it("devuelve null si el periodo anterior es 0 (no inventa porcentaje)", () => {
    expect(variacion([0, 0, 5, 1])).toBeNull();
  });
});

describe("metrica", () => {
  it("devuelve solo el periodo actual en la serie, con su total y variación", () => {
    const m = metrica([{ dia: "2026-10-04", n: 2 }, { dia: "2026-10-07", n: 4 }], 2, hoy);
    expect(m.serie).toEqual([0, 4]); // 06, 07
    expect(m.total).toBe(4);
    expect(m.variacion).toBe(100); // 04–05 = 2 → 06–07 = 4
  });
});
