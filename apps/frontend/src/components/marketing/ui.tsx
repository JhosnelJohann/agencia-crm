"use client";
import { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@/lib/bootstrap-icons";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { cn } from "@/lib/utils";

/** Biblioteca visual compartida por los módulos de marketing (mismo lenguaje que el panel y Servicios). */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const inputCls = "w-full h-11 px-3.5 rounded-xl bg-white/[0.045] border border-white/10 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20";
export const areaCls = "w-full px-3.5 py-3 rounded-xl bg-white/[0.045] border border-white/10 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20";
export const labelCls = "text-[10.5px] font-bold uppercase tracking-[2px] text-ink-sub block mb-1.5";
export const btnGhost = "h-11 px-5 rounded-2xl border border-line bg-white/[0.04] hover:bg-white/[0.08] hover:border-brand-primary/30 text-ink font-bold text-sm inline-flex items-center justify-center gap-2 transition";
export const btnAurora = "btn-aurora h-11 px-5 rounded-2xl text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";

/** Encabezado de módulo: icono 3D flotante, kicker, titular Barlow y acciones/indicadores a la derecha. */
export function ModuleHero({ icon, kicker, title, accent, subtitle, children }: {
  icon: AppIconName; kicker: string; title: string; accent?: string; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
      className="glass-3d rounded-[28px] relative overflow-hidden px-6 py-5 sm:px-7 mb-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(232,88,26,0.24), transparent 72%)" }} />
      <div className="relative flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-5 min-w-0">
          <AppIcon name={icon} size={64} className="shrink-0" />
          <div className="min-w-0">
            <div className="kicker">{kicker}</div>
            <h1 className="mt-1.5 text-[clamp(28px,3.4vw,44px)] leading-none text-ink">
              {title}{accent && <> <span className="text-brand-orange text-orange-glow">{accent}</span></>}
            </h1>
            {subtitle && <p className="mt-1.5 text-ink-sub text-[14px] max-w-xl">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="w-full lg:w-auto grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 [&>button:last-child]:col-span-2 sm:[&>button:last-child]:col-span-1">{children}</div>}
      </div>
    </motion.div>
  );
}

/** Indicador con número animado. */
export function StatTile({ label, value, suffix, prefix, hint, icon, tone = "neutral", delay = 0, decimals = 0 }: {
  label: string; value: number | null; suffix?: string; prefix?: string; hint?: string; icon?: AppIconName; tone?: "neutral" | "accent" | "good" | "bad"; delay?: number; decimals?: number;
}) {
  const ring = tone === "accent" ? "border-brand-primary/30 bg-brand-primary/[0.08]" : tone === "good" ? "border-brand-green/25 bg-brand-green/[0.06]" : tone === "bad" ? "border-brand-red/25 bg-brand-red/[0.06]" : "border-line bg-white/[0.03]";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}
      className={cn("rounded-2xl border px-4 py-3 min-w-0 sm:min-w-[132px]", ring)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[2px] text-ink-sub font-semibold">{label}</div>
        {icon && <AppIcon name={icon} size={26} />}
      </div>
      <div className="mt-1 font-display font-extrabold text-[34px] leading-none tabular-nums text-ink">
        <NumberTicker value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </motion.div>
  );
}

/** Panel de cristal con cabecera. */
export function Panel({ title, kicker, icon, right, children, className, delay = 0 }: {
  title?: string; kicker?: string; icon?: AppIconName; right?: React.ReactNode; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}
      className={cn("glass-3d rounded-[24px] p-6", className)}>
      {(title || kicker) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {icon && <AppIcon name={icon} size={34} />}
            <div>
              {kicker && <div className="kicker !text-[10.5px]">{kicker}</div>}
              {title && <h2 className="text-[28px] leading-none text-ink mt-1">{title}</h2>}
            </div>
          </div>
          {right}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: AppIconName; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <AppIcon name={icon} size={84} />
      <div className="mt-4 font-display font-bold text-[28px] uppercase tracking-wide text-ink">{title}</div>
      <p className="mt-1 text-ink-sub max-w-md mx-auto">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, icon, children, width = "max-w-xl" }: {
  open: boolean; onClose: () => void; title: string; icon?: AppIconName; children: React.ReactNode; width?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ ease: EASE, duration: 0.35 }}
            onClick={(e) => e.stopPropagation()} data-lenis-prevent
            className={cn("glass-3d glass-blur rounded-[28px] p-7 w-full max-h-[92vh] overflow-y-auto scrollbar-thin", width)}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {icon && <AppIcon name={icon} size={40} />}
                <h2 className="text-[30px] leading-none text-ink">{title}</h2>
              </div>
              <button onClick={onClose} aria-label="Cerrar" className="h-10 w-10 rounded-xl hover:bg-white/[0.08] flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent" }) {
  const t = { neutral: "bg-white/[0.06] text-ink-sub", good: "bg-brand-green/10 text-brand-green border border-brand-green/25", warn: "bg-amber-400/10 text-amber-400 border border-amber-400/25", bad: "bg-brand-red/10 text-brand-red border border-brand-red/25", accent: "bg-brand-primary/10 text-brand-primary border border-brand-primary/25" }[tone];
  return <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[1.6px]", t)}>{children}</span>;
}

/** Interruptor accesible. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 rounded-full transition-colors shrink-0", checked ? "bg-brand-primary" : "bg-white/[0.12]")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/** Gráfica de área con dos series (SVG puro, animada; sin dependencias pesadas). */
export function AreaChart({ data, a, b, labelA, labelB }: {
  data: { dia: string; [k: string]: any }[]; a: string; b?: string; labelA: string; labelB?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const W = 640, H = 190, P = 6;
  const max = Math.max(1, ...data.map((d) => Number(d[a]) || 0), ...(b ? data.map((d) => Number(d[b]) || 0) : [0]));
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - P * 2 - 10);
  const line = (k: string) => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(Number(d[k]) || 0).toFixed(1)}`).join(" ");
  const area = (k: string) => `${line(k)} L${x(data.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[190px]" role="img" aria-label={`${labelA}${labelB ? " y " + labelB : ""} por día`}>
        <defs>
          <linearGradient id={`ga-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8581a" stopOpacity="0.55" /><stop offset="1" stopColor="#e8581a" stopOpacity="0" /></linearGradient>
          <linearGradient id={`gb-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2e8f0" stopOpacity="0.28" /><stop offset="1" stopColor="#e2e8f0" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={P} x2={W - P} y1={H - P - t * (H - P * 2 - 10)} y2={H - P - t * (H - P * 2 - 10)} stroke="rgba(226, 232, 240,0.06)" />)}
        {b && <><path d={area(b)} fill={`url(#gb-${uid})`} /><motion.path d={line(b)} fill="none" stroke="#e2e8f0" strokeOpacity="0.7" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE }} /></>}
        <path d={area(a)} fill={`url(#ga-${uid})`} />
        <motion.path d={line(a)} fill="none" stroke="#e8581a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 8px rgba(232,88,26,0.7))" }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE, delay: 0.1 }} />
        {data.map((d, i) => (Number(d[a]) > 0 ? <circle key={i} cx={x(i)} cy={y(Number(d[a]))} r="3.2" fill="#e8581a" /> : null))}
      </svg>
      <div className="mt-2 flex items-center gap-5 text-xs text-ink-sub">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-brand-primary" />{labelA}</span>
        {b && <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-ink/70" />{labelB}</span>}
        <span className="ml-auto text-ink-muted">últimos {data.length} días</span>
      </div>
    </div>
  );
}

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : Array.isArray(j.error) ? j.error.map((e: any) => e.message).join(", ") : `Error ${r.status}`);
  return j as T;
}
