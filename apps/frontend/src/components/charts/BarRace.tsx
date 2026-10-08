"use client";
import { motion } from "framer-motion";

export interface RaceRow { label: string; a: number; b: number }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Carrera de barras: por fila, una barra de fondo (A, p. ej. vistas) y encima la de B (p. ej. envíos),
 * creciendo en cascada; al final, la tasa B/A en una píldora. Ordenadas por B de mayor a menor.
 */
export function BarRace({ rows, labelA, labelB, max = 6 }: { rows: RaceRow[]; labelA: string; labelB: string; max?: number }) {
  const data = [...rows].sort((x, y) => y.b - x.b || y.a - x.a).slice(0, max);
  const top = Math.max(1, ...data.map((r) => Math.max(r.a, r.b)));
  if (!data.length) return null;
  return (
    <div>
      <div className="space-y-3">
        {data.map((r, i) => {
          const rate = r.a > 0 ? (r.b / r.a) * 100 : null;
          return (
            <div key={r.label + i} className="grid grid-cols-[minmax(0,160px)_1fr_auto] items-center gap-3">
              <span className="truncate text-[13px] font-semibold text-ink" title={r.label}>{r.label}</span>
              <div className="relative h-7 rounded-lg bg-black/[0.04] overflow-hidden">
                <motion.div className="absolute inset-y-0 left-0 rounded-lg bg-slate-400/35"
                  initial={{ width: 0 }} animate={{ width: `${(r.a / top) * 100}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.1 + i * 0.08 }} />
                <motion.div className="absolute inset-y-1 left-0 rounded-md bg-gradient-to-r from-[#c2410c] to-brand-primary"
                  initial={{ width: 0 }} animate={{ width: `${(r.b / top) * 100}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.3 + i * 0.08 }} />
                <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-bold tabular-nums text-ink-sub">{r.b} / {r.a}</span>
              </div>
              <span className="w-14 text-right text-[12px] font-bold tabular-nums text-[#c2410c]">{rate == null ? "—" : `${rate.toFixed(rate < 10 ? 1 : 0)}%`}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-5 text-xs text-ink-sub">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-slate-400/50" />{labelA}</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-brand-primary" />{labelB}</span>
      </div>
    </div>
  );
}
