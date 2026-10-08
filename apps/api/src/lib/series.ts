/**
 * Series diarias para las mini-gráficas del panel (sparklines y variación %).
 * La consulta SQL devuelve solo los días con actividad; aquí se rellenan los huecos con 0 para tener
 * exactamente `dias * 2` puntos (periodo anterior + periodo actual), y se calcula la variación.
 */
export interface FilaDia { dia: string | Date; n: number | string }

const clave = (d: Date) => d.toISOString().slice(0, 10);

/** Devuelve `total` valores diarios terminando en `hoy` (incluido), del más antiguo al más reciente. */
export function rellenarSerieDiaria(filas: FilaDia[], total: number, hoy: Date): number[] {
  const porDia = new Map<string, number>();
  for (const f of filas) {
    const k = typeof f.dia === "string" ? f.dia.slice(0, 10) : clave(f.dia);
    porDia.set(k, (porDia.get(k) || 0) + Number(f.n || 0));
  }
  const base = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
  const out: number[] = [];
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    out.push(porDia.get(clave(d)) || 0);
  }
  return out;
}

/**
 * Variación % del periodo actual (segunda mitad) frente al anterior (primera mitad).
 * `null` si el periodo anterior es 0: no hay base para comparar y no se inventa un porcentaje.
 */
export function variacion(serieDoble: number[]): number | null {
  const mitad = Math.floor(serieDoble.length / 2);
  const antes = serieDoble.slice(0, mitad).reduce((a, b) => a + b, 0);
  const ahora = serieDoble.slice(mitad).reduce((a, b) => a + b, 0);
  if (antes === 0) return null;
  return Math.round(((ahora - antes) / antes) * 1000) / 10;
}

/** Arma la respuesta de una métrica: la serie del periodo actual y su variación frente al anterior. */
export function metrica(filas: FilaDia[], dias: number, hoy: Date): { serie: number[]; variacion: number | null; total: number } {
  const doble = rellenarSerieDiaria(filas, dias * 2, hoy);
  const serie = doble.slice(dias);
  return { serie, variacion: variacion(doble), total: serie.reduce((a, b) => a + b, 0) };
}
