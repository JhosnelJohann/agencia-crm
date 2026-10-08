"use client";
import { motion } from "framer-motion";
import { NumberTicker } from "@/components/magic/NumberTicker";

/**
 * Medidor de cobranza estilo terminal financiera: 60 marcas que se encienden en secuencia hasta el %
 * cobrado, escala 0/25/50/75 y cifra central tabular. Las marcas apagadas se ven sobre fondo claro.
 */
export function CollectionRing({ pct, size = 196, loading = false }: { pct: number; size?: number; loading?: boolean }) {
  const TICKS = 60;
  const p = Math.max(0, Math.min(1, pct));
  const lit = Math.round(p * TICKS);
  const c = size / 2, rOut = size / 2 - 6, rIn = rOut - 16;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
          const major = i % 15 === 0;
          const r1 = major ? rIn - 4 : rIn;
          const on = i < lit;
          return (
            <motion.line key={i}
              x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * rOut} y2={c + Math.sin(a) * rOut}
              strokeWidth={major ? 3 : 2.2} strokeLinecap="round"
              initial={{ stroke: "rgba(100,116,139,0.22)" }}
              animate={{ stroke: on ? `hsl(${18 + (i / TICKS) * 14} 85% ${52 - (i / TICKS) * 10}%)` : "rgba(100,116,139,0.22)" }}
              transition={{ duration: 0.25, delay: on ? 0.35 + i * 0.018 : 0 }}
            />
          );
        })}
        {/* Escala */}
        {[0, 25, 50, 75].map((v) => {
          const a = (v / 100) * Math.PI * 2 - Math.PI / 2, r = rIn - 16;
          return <text key={v} x={c + Math.cos(a) * r} y={c + Math.sin(a) * r} textAnchor="middle" dominantBaseline="central" className="fill-ink-muted" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{v}</text>;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display font-extrabold text-[40px] leading-none tabular-nums text-ink">
          {loading ? "—" : <NumberTicker value={Math.round(p * 100)} suffix="%" />}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[2.4px] text-ink-muted font-semibold">cobrado</div>
      </div>
    </div>
  );
}
