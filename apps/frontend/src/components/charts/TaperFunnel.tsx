"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { useMotionOk } from "@/components/motion/useMotionOk";

export interface FunnelStage { label: string; value: number; color: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Embudo cónico horizontal: cada etapa es un tramo cuya altura refleja cuántos casos tiene, unido al
 * siguiente con curvas. Se revela de izquierda a derecha y, si hay movimiento, partículas recorren el
 * eje como casos avanzando. La conversión entre etapas consecutivas va bajo cada unión.
 */
export function TaperFunnel({ stages, height = 190 }: { stages: FunnelStage[]; height?: number }) {
  const uid = useId().replace(/:/g, "");
  const motionOk = useMotionOk();
  if (stages.length < 2 || stages.every((s) => s.value === 0)) return null;

  const W = 1000, H = height, mid = H / 2, PAD = 18;
  const max = Math.max(1, ...stages.map((s) => s.value));
  const seg = W / stages.length;
  const half = (v: number) => Math.max(10, (v / max) * (H / 2 - PAD));

  // Contorno superior/inferior: meseta por etapa + curva hacia la siguiente.
  let top = "", bot = "";
  stages.forEach((s, i) => {
    const x0 = i * seg, x1 = x0 + seg * 0.62, h = half(s.value);
    if (i === 0) { top += `M${x0},${mid - h}`; bot = `L${x0},${mid + h}` + bot; }
    top += ` L${x1},${mid - h}`;
    bot = ` L${x1},${mid + h}` + bot;
    const next = stages[i + 1];
    const x2 = (i + 1) * seg;
    if (next) {
      const hn = half(next.value), cx = (x1 + x2) / 2;
      top += ` C${cx},${mid - h} ${cx},${mid - hn} ${x2},${mid - hn}`;
      bot = ` C${cx},${mid + hn} ${cx},${mid + h} ${x1},${mid + h}` + bot;
      bot = ` L${x2},${mid + hn}` + bot;
    } else {
      top += ` L${W},${mid - h}`;
      bot = ` L${W},${mid + h}` + bot;
    }
  });
  const shape = `${top}${bot} Z`;
  const axis = `M0,${mid} L${W},${mid}`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }} role="img"
        aria-label={stages.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        <defs>
          <linearGradient id={`tf${uid}`} x1="0" x2="1" y1="0" y2="0">
            {stages.map((s, i) => <stop key={i} offset={stages.length === 1 ? 0 : i / (stages.length - 1)} stopColor={s.color} stopOpacity="0.85" />)}
          </linearGradient>
          <clipPath id={`tfc${uid}`}>
            <motion.rect x="0" y="0" height={H} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.4, ease: EASE }} />
          </clipPath>
        </defs>
        <g clipPath={`url(#tfc${uid})`}>
          <path d={shape} fill={`url(#tf${uid})`} />
          <path d={shape} fill="none" stroke="#fff" strokeOpacity="0.35" vectorEffect="non-scaling-stroke" />
          {stages.slice(1).map((_, i) => (
            <line key={i} x1={(i + 1) * seg} x2={(i + 1) * seg} y1={PAD / 2} y2={H - PAD / 2} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {motionOk && Array.from({ length: 7 }, (_, i) => (
          <circle key={i} r="3.2" fill="#fff" opacity="0.85">
            <animateMotion dur={`${5 + (i % 3)}s`} begin={`${-i * 0.9}s`} repeatCount="indefinite" path={axis} />
            <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.85;1" dur={`${5 + (i % 3)}s`} begin={`${-i * 0.9}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
      <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s, i) => {
          const prev = stages[i - 1];
          const conv = prev && prev.value > 0 ? Math.round((s.value / prev.value) * 100) : null;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08, ease: EASE }} className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-[10.5px] uppercase tracking-[1.6px] font-semibold text-ink-sub truncate">{s.label}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display font-extrabold text-[22px] leading-none tabular-nums text-ink">{s.value}</span>
                {conv != null && <span className="text-[11px] font-bold tabular-nums text-ink-muted">{conv}%</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
