"use client";
import { motion } from "framer-motion";

export interface FlowSegment { label: string; value: number; color: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Barra de composición al 100 %: cada estado es un tramo que crece en secuencia, con franjas diagonales
 * que se desplazan (clase .flow-stripes; se detienen con fx-off o "reducir movimiento"). Leyenda debajo.
 */
export function StackedFlow({ segments }: { segments: FlowSegment[] }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  return (
    <div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-black/[0.05]" role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {total > 0 && segments.filter((s) => s.value > 0).map((s, i) => (
          <motion.div key={s.label} className="flow-stripes h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: s.color }}
            initial={{ width: 0 }} animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 1, ease: EASE, delay: 0.15 + i * 0.12 }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-ink-sub truncate">{s.label}</span>
            <span className="ml-auto text-sm font-bold tabular-nums text-ink">{s.value}</span>
            <span className="text-[11px] tabular-nums text-ink-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
