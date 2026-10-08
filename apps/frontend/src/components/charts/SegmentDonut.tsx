"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export interface DonutSegment { name: string; value: number; color: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Dona segmentada: los tramos se barren uno tras otro con separación entre ellos. Al pasar el ratón por
 * un tramo (o por su leyenda) se resalta y el centro muestra su cifra; sin ratón, el total.
 */
export function SegmentDonut({ segments, size = 180, centerLabel = "total" }: { segments: DonutSegment[]; size?: number; centerLabel?: string }) {
  const [hot, setHot] = useState<number | null>(null);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const c = size / 2, stroke = 18, r = c - stroke / 2 - 4, len = 2 * Math.PI * r;
  const GAP = segments.filter((s) => s.value > 0).length > 1 ? 6 : 0;

  let acc = 0;
  const arcs = segments.map((s, i) => {
    const frac = total ? s.value / total : 0;
    const a = { i, s, start: acc, dash: Math.max(0, frac * len - GAP) };
    acc += frac * len;
    return a;
  });
  const shown = hot != null ? segments[hot] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img"
          aria-label={segments.map((s) => `${s.name}: ${s.value}`).join(", ")}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth={stroke} />
          {arcs.filter((a) => a.dash > 0).map((a, k) => (
            <motion.circle key={a.s.name} cx={c} cy={c} r={r} fill="none" stroke={a.s.color} strokeWidth={hot === a.i ? stroke + 5 : stroke}
              strokeLinecap="butt" strokeDashoffset={-a.start}
              initial={{ strokeDasharray: `0 ${len}` }} animate={{ strokeDasharray: `${a.dash} ${len}` }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.2 + k * 0.22 }}
              opacity={hot == null || hot === a.i ? 1 : 0.35}
              style={{ transition: "opacity .2s, stroke-width .2s", cursor: "default" }}
              onPointerEnter={() => setHot(a.i)} onPointerLeave={() => setHot(null)} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-display font-extrabold text-[34px] leading-none tabular-nums text-ink">{shown ? shown.value : total}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[2px] font-semibold text-ink-muted">{shown ? shown.name : centerLabel}</div>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {segments.map((s, i) => (
          <li key={s.name} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)}
            className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition ${hot === i ? "bg-black/[0.04]" : ""}`}>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-sm text-ink-sub">{s.name}</span>
            <span className="font-bold tabular-nums text-ink">{s.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-ink-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
