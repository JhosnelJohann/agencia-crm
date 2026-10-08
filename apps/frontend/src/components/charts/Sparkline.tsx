"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Mini-gráfica de tendencia (estilo cotización): verde si cierra por encima de donde empezó, roja si no. */
export function Sparkline({ data, width = 80, height = 28, className }: { data: number[]; width?: number; height?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => (i * width) / (data.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const d = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const up = data[data.length - 1] >= data[0];
  const c = up ? "#16a34a" : "#dc2626";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.25" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={`url(#s${uid})`} />
      <motion.path d={d} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r={2.2} fill={c} />
    </svg>
  );
}
