"use client";
import { motion } from "framer-motion";

export interface Ring { label: string; pct: number; color: string; detail?: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Anillos concéntricos (estilo anillos de actividad): cada métrica es un arco que se barre hasta su %,
 * del exterior al interior con un pequeño desfase. Leyenda a la derecha con el % y el detalle.
 */
export function RadialRings({ rings, size = 176 }: { rings: Ring[]; size?: number }) {
  const c = size / 2, stroke = 12, gap = 6;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" role="img"
        aria-label={rings.map((r) => `${r.label} ${Math.round(r.pct * 100)}%`).join(", ")}>
        {rings.map((r, i) => {
          const rad = c - stroke / 2 - i * (stroke + gap);
          const len = 2 * Math.PI * rad;
          const p = Math.max(0, Math.min(1, r.pct));
          return (
            <g key={r.label}>
              <circle cx={c} cy={c} r={rad} fill="none" stroke={r.color} strokeOpacity="0.13" strokeWidth={stroke} />
              <motion.circle cx={c} cy={c} r={rad} fill="none" stroke={r.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={len} initial={{ strokeDashoffset: len }} animate={{ strokeDashoffset: len * (1 - p) }}
                transition={{ duration: 1.5, ease: EASE, delay: 0.2 + i * 0.15 }}
                style={{ filter: `drop-shadow(0 0 6px ${r.color}66)` }} />
            </g>
          );
        })}
      </svg>
      <ul className="space-y-3 w-full">
        {rings.map((r, i) => (
          <motion.li key={r.label} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, ease: EASE }}
            className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: r.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[1.8px] font-semibold text-ink-sub">{r.label}</div>
              {r.detail && <div className="text-xs text-ink-muted truncate">{r.detail}</div>}
            </div>
            <span className="font-display font-extrabold text-[22px] tabular-nums text-ink">{(r.pct * 100).toFixed(r.pct < 0.1 && r.pct > 0 ? 1 : 0)}%</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
