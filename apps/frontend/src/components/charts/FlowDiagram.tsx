"use client";
import { motion } from "framer-motion";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { useMotionOk } from "@/components/motion/useMotionOk";
import { cn } from "@/lib/utils";

export interface FlowNode { label: string; value: number | null; prefix?: string; icon: AppIconName; hint?: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Diagrama de flujo del negocio (estilo diagramas de Linear): nodos unidos por conectores cuyo grosor
 * refleja la conversión, con pulsos de datos que viajan por la línea. En móvil se apila en vertical.
 * Los pulsos solo corren si useMotionOk(); los porcentajes se muestran siempre.
 */
export function FlowDiagram({ nodes, rates }: { nodes: FlowNode[]; rates: (number | null)[] }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch">
      {nodes.map((n, i) => (
        <div key={n.label} className="contents">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.12 }}
            className="relative flex-1 min-w-0 rounded-2xl border border-line bg-white/[0.03] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] uppercase tracking-[2px] font-semibold text-ink-sub truncate">{n.label}</span>
              <AppIcon name={n.icon} size={28} />
            </div>
            <div className="mt-2 font-display font-extrabold text-[30px] leading-none tabular-nums text-ink truncate">
              <NumberTicker value={n.value} prefix={n.prefix} />
            </div>
            {n.hint && <div className="mt-1 text-[11px] text-ink-muted truncate">{n.hint}</div>}
          </motion.div>
          {i < nodes.length - 1 && <Connector rate={rates[i] ?? null} index={i} />}
        </div>
      ))}
    </div>
  );
}

function Connector({ rate, index }: { rate: number | null; index: number }) {
  const motionOk = useMotionOk();
  const w = rate == null ? 1.5 : 1.5 + Math.max(0, Math.min(1, rate)) * 5;
  const pct = rate == null ? "—" : `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`;
  return (
    <div className="relative shrink-0 flex items-center justify-center h-12 sm:h-auto sm:w-20">
      {/* Horizontal (escritorio) */}
      <svg className="hidden sm:block absolute inset-0 h-full w-full" viewBox="0 0 80 100" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="50" x2="80" y2="50" stroke="#e8581a" strokeOpacity="0.25" strokeWidth={w} vectorEffect="non-scaling-stroke" />
        {motionOk && <line x1="0" y1="50" x2="80" y2="50" stroke="#e8581a" strokeWidth={Math.max(2, w)} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          pathLength={100} className="flow-pulse" style={{ animationDelay: `${index * -0.6}s` }} />}
      </svg>
      {/* Vertical (móvil) */}
      <svg className="sm:hidden absolute inset-0 h-full w-full" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden>
        <line x1="50" y1="0" x2="50" y2="48" stroke="#e8581a" strokeOpacity="0.25" strokeWidth={w} vectorEffect="non-scaling-stroke" />
        {motionOk && <line x1="50" y1="0" x2="50" y2="48" stroke="#e8581a" strokeWidth={Math.max(2, w)} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          pathLength={100} className="flow-pulse" style={{ animationDelay: `${index * -0.6}s` }} />}
      </svg>
      <span className={cn("relative z-10 rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums bg-[var(--content-fill,#fff)]",
        rate == null ? "border-line text-ink-muted" : "border-brand-primary/30 text-brand-primary")}>
        {pct}
      </span>
    </div>
  );
}
