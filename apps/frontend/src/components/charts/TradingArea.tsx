"use client";
import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Área estilo terminal financiera: rejilla fina, línea que se dibuja al cargar y cursor vertical con
 * punto y valores flotantes al pasar el ratón (o el dedo). Serie A en naranja, B opcional en pizarra.
 */
export function TradingArea({ data, a, b, labelA, labelB, height = 190 }: {
  data: { dia: string; [k: string]: any }[]; a: string; b?: string; labelA: string; labelB?: string; height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, P = 6;
  const val = (d: any, k: string) => Number(d[k]) || 0;
  const max = Math.max(1, ...data.map((d) => val(d, a)), ...(b ? data.map((d) => val(d, b)) : [0]));
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2 - 10);
  const line = (k: string) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val(d, k)).toFixed(1)}`).join(" ");
  const area = (k: string) => `${line(k)} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;

  const onMove = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || data.length === 0) return;
    const rel = ((clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((rel - P) / (W - P * 2)) * (data.length - 1)))));
  };
  const h = hover != null ? data[hover] : null;
  const fecha = (s: string) => { const d = new Date(s); return isNaN(+d) ? s : d.toLocaleDateString("es", { day: "numeric", month: "short" }); };

  return (
    <div>
      <div ref={box} className="relative" onPointerMove={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }} role="img" aria-label={`${labelA}${labelB ? " y " + labelB : ""} por día`}>
          <defs>
            <linearGradient id={`ga-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8581a" stopOpacity="0.32" /><stop offset="1" stopColor="#e8581a" stopOpacity="0" /></linearGradient>
            <linearGradient id={`gb-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64748b" stopOpacity="0.16" /><stop offset="1" stopColor="#64748b" stopOpacity="0" /></linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={P} x2={W - P} y1={H - P - t * (H - P * 2 - 10)} y2={H - P - t * (H - P * 2 - 10)} stroke="currentColor" strokeOpacity="0.07" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
          ))}
          {b && <>
            <path d={area(b)} fill={`url(#gb-${uid})`} />
            <motion.path d={line(b)} fill="none" stroke="#64748b" strokeOpacity="0.8" strokeWidth="1.8" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE }} />
          </>}
          <path d={area(a)} fill={`url(#ga-${uid})`} />
          <motion.path d={line(a)} fill="none" stroke="#e8581a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE, delay: 0.1 }} />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} stroke="#e8581a" strokeOpacity="0.45" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {h && hover != null && (
          <>
            <span className="pointer-events-none absolute h-2.5 w-2.5 -ml-[5px] -mt-[5px] rounded-full bg-brand-primary ring-4 ring-brand-primary/20"
              style={{ left: `${(x(hover) / W) * 100}%`, top: y(val(h, a)) }} />
            <div className="pointer-events-none absolute top-0 z-10 rounded-xl border border-white/10 bg-[#0b1120]/95 px-3 py-2 text-[11px] text-slate-200 shadow-xl backdrop-blur"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? "calc(-100% - 10px)" : "10px"})` }}>
              <div className="font-bold text-white">{fecha(h.dia)}</div>
              <div className="mt-1 flex items-center gap-2 tabular-nums"><span className="h-1.5 w-3 rounded-full bg-brand-primary" />{labelA}: <b className="text-white">{val(h, a)}</b></div>
              {b && <div className="flex items-center gap-2 tabular-nums"><span className="h-1.5 w-3 rounded-full bg-slate-400" />{labelB}: <b className="text-white">{val(h, b)}</b></div>}
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex items-center gap-5 text-xs text-ink-sub">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-brand-primary" />{labelA}</span>
        {b && <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-slate-500" />{labelB}</span>}
        <span className="ml-auto text-ink-muted">últimos {data.length} días</span>
      </div>
    </div>
  );
}
