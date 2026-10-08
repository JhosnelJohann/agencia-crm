"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@/lib/bootstrap-icons";
import { NavIcon, type NavIconRef } from "@/components/ui/NavIcon";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { WireShape, type WireKind } from "@/components/motion/WireShape";
import { Sparkline } from "@/components/charts/Sparkline";
import { cn } from "@/lib/utils";

/** Biblioteca visual compartida por los módulos de marketing (mismo lenguaje que el panel y Servicios). */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const inputCls = "w-full h-11 px-3.5 rounded-xl bg-white/[0.045] border border-white/10 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20";
export const areaCls = "w-full px-3.5 py-3 rounded-xl bg-white/[0.045] border border-white/10 text-sm text-ink placeholder:text-ink-muted outline-none transition focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20";
export const labelCls = "text-[10.5px] font-bold uppercase tracking-[2px] text-ink-sub block mb-1.5";
export const btnGhost = "h-11 px-5 rounded-2xl border border-line bg-white/[0.04] hover:bg-white/[0.08] hover:border-brand-primary/30 text-ink font-bold text-sm inline-flex items-center justify-center gap-2 transition";
export const btnAurora = "btn-aurora h-11 px-5 rounded-2xl text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";

/** Encabezado de módulo: icono (o logo de la plataforma), kicker, titular Barlow y acciones/indicadores a la derecha. */
export function ModuleHero({ icon, kicker, title, accent, subtitle, children, shape = "icosahedron" }: {
  icon: NavIconRef; kicker: string; title: string; accent?: string; subtitle?: string; children?: React.ReactNode;
  /** Poliedro de alambre de fondo: cada módulo usa una variante distinta. */
  shape?: WireKind;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
      className="glass-3d rounded-[28px] relative overflow-hidden px-6 py-5 sm:px-7 mb-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(232,88,26,0.24), transparent 72%)" }} />
      <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden />
      <WireShape kind={shape} size={300} className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-60 hidden md:block" />
      <div className="relative flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-5 min-w-0">
          <NavIcon icon={icon} size={64} className="shrink-0" />
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
export function StatTile({ label, value, suffix, prefix, hint, icon, tone = "neutral", delay = 0, decimals = 0, spark, delta }: {
  label: string; value: number | null; suffix?: string; prefix?: string; hint?: string; icon?: NavIconRef; tone?: "neutral" | "accent" | "good" | "bad"; delay?: number; decimals?: number;
  /** Serie real (p. ej. últimos 30 días) para la mini-gráfica; sin serie no se dibuja nada. */
  spark?: number[];
  /** Variación % frente al periodo anterior; null/undefined = sin dato (no se inventa). */
  delta?: number | null;
}) {
  const ring = tone === "accent" ? "border-brand-primary/30 bg-brand-primary/[0.08]" : tone === "good" ? "border-brand-green/25 bg-brand-green/[0.06]" : tone === "bad" ? "border-brand-red/25 bg-brand-red/[0.06]" : "border-line bg-white/[0.03]";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}
      className={cn("rounded-2xl border px-4 py-3 min-w-0 sm:min-w-[132px]", ring)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[2px] text-ink-sub font-semibold">{label}</div>
        {icon && <NavIcon icon={icon} size={26} />}
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="font-display font-extrabold text-[34px] leading-none tabular-nums text-ink">
          <NumberTicker value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} width={72} height={26} className="mb-1" />}
      </div>
      {(hint || delta != null) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
          {delta != null && <Delta value={delta} />}
          {hint}
        </div>
      )}
    </motion.div>
  );
}

/** Panel de cristal con cabecera. */
export function Panel({ title, kicker, icon, right, children, className, delay = 0 }: {
  title?: string; kicker?: string; icon?: NavIconRef; right?: React.ReactNode; children: React.ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}
      className={cn("glass-3d rounded-[24px] p-6", className)}>
      {(title || kicker) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            {icon && <NavIcon icon={icon} size={34} />}
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

/** Variación % estilo terminal financiera: flecha y color según el signo, cifras tabulares. */
export function Delta({ value }: { value: number }) {
  const up = value > 0, flat = value === 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
      flat ? "bg-ink/5 text-ink-sub" : up ? "bg-brand-green/10 text-[#15803d]" : "bg-brand-red/10 text-[#b91c1c]")}>
      {flat ? "■" : up ? "▲" : "▼"} {Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}%
    </span>
  );
}

export function EmptyState({ icon, title, text, action, shape = "icosahedron" }: { icon: NavIconRef; title: string; text: string; action?: React.ReactNode; shape?: WireKind }) {
  return (
    <div className="py-14 text-center">
      <div className="relative mx-auto h-[150px] w-[150px] flex items-center justify-center">
        <WireShape kind={shape} size={150} className="absolute inset-0 opacity-50" speed={0.7} />
        <NavIcon icon={icon} size={72} className="relative" />
      </div>
      <div className="mt-4 font-display font-bold text-[28px] uppercase tracking-wide text-ink">{title}</div>
      <p className="mt-1 text-ink-sub max-w-md mx-auto">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, icon, children, width = "max-w-xl" }: {
  open: boolean; onClose: () => void; title: string; icon?: NavIconRef; children: React.ReactNode; width?: string;
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
                {icon && <NavIcon icon={icon} size={40} />}
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
/** Compatibilidad: el área de 30 días ahora es la gráfica estilo terminal (cursor y valores flotantes). */
export { TradingArea as AreaChart } from "@/components/charts/TradingArea";

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : Array.isArray(j.error) ? j.error.map((e: any) => e.message).join(", ") : `Error ${r.status}`);
  return j as T;
}
