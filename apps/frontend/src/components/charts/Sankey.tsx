"use client";
import { HorizontalScrollArea } from "@/components/ui/HorizontalScrollArea";
import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";

export interface SankeyRow { campana: string; fuente: string; leads: number; ganadas: number; ingresos: number }

const EASE = [0.16, 1, 0.3, 1] as const;
const PALETTE = ["#e8581a", "#f08a5a", "#c96a3d", "#f0b040", "#5d8fa8", "#8b5cf6", "#64748b"];
const money = (n: number) => "$" + Math.round(n).toLocaleString("es");

/**
 * Sankey de atribución: de qué campaña/fuente vienen los leads y cuántos acaban ganados. Solo usa lo que da
 * /api/marketing/anuncios/atribucion (leads y ganadas): el destino es "Ganadas" o "Sin cerrar" (no se
 * inventa una categoría de perdidas). Más de 6 campañas se agrupan en "Otras". SVG propio, sin librería.
 */
export function Sankey({ rows }: { rows: SankeyRow[] }) {
  const uid = useId().replace(/:/g, "");
  const [hot, setHot] = useState<number | null>(null);

  const data = useMemo(() => {
    const sorted = [...rows].filter((r) => r.leads > 0).sort((a, b) => b.leads - a.leads);
    const top = sorted.slice(0, 6).map((r) => ({ name: r.campana || r.fuente || "Sin campaña", leads: r.leads, won: Math.min(r.ganadas, r.leads), ingresos: r.ingresos }));
    const rest = sorted.slice(6);
    if (rest.length) top.push({ name: `Otras (${rest.length})`, leads: rest.reduce((n, r) => n + r.leads, 0), won: rest.reduce((n, r) => n + Math.min(r.ganadas, r.leads), 0), ingresos: rest.reduce((n, r) => n + r.ingresos, 0) });
    return top;
  }, [rows]);

  const total = data.reduce((n, d) => n + d.leads, 0);
  if (!total) return null;
  const won = data.reduce((n, d) => n + d.won, 0);
  const ingresos = data.reduce((n, d) => n + d.ingresos, 0);

  const W = 720, LEFT = 190, RIGHT = 150, NODE = 10, GAP = 10;
  const H = Math.max(220, data.length * 46);
  const usable = H - GAP * (data.length - 1);
  const k = usable / total;
  const x0 = LEFT, x1 = W - RIGHT, xm = (x0 + x1) / 2;

  // Columna izquierda: un nodo por campaña. Derecha: Ganadas arriba y Sin cerrar abajo.
  let y = 0;
  const left = data.map((d) => { const n = { y, h: d.leads * k }; y += n.h + GAP; return n; });
  const rightGap = 18;
  const wonH = won * k, openH = (total - won) * k;
  const rWon = { y: (H - wonH - openH - rightGap) / 2, h: wonH };
  const rOpen = { y: rWon.y + wonH + rightGap, h: openH };

  let wonCursor = rWon.y, openCursor = rOpen.y;
  const bands: { i: number; kind: "won" | "open"; a: number; b: number; h: number }[] = [];
  data.forEach((d, i) => {
    const hw = d.won * k, ho = (d.leads - d.won) * k;
    if (hw > 0) { bands.push({ i, kind: "won", a: left[i].y, b: wonCursor, h: hw }); wonCursor += hw; }
    if (ho > 0) { bands.push({ i, kind: "open", a: left[i].y + hw, b: openCursor, h: ho }); openCursor += ho; }
  });
  const band = (a: number, b: number, h: number) =>
    `M${x0},${a} C${xm},${a} ${xm},${b} ${x1},${b} L${x1},${b + h} C${xm},${b + h} ${xm},${a + h} ${x0},${a + h} Z`;

  return (
    <HorizontalScrollArea className="scrollbar-thin" lenisPrevent>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" style={{ height: H }} role="img"
        aria-label={`${total} leads de ${data.length} campañas; ${won} ganadas`}>
        <defs>
          {data.map((_, i) => (
            <linearGradient key={i} id={`sk${uid}-${i}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={PALETTE[i % PALETTE.length]} stopOpacity="0.55" />
              <stop offset="1" stopColor={PALETTE[i % PALETTE.length]} stopOpacity="0.18" />
            </linearGradient>
          ))}
          <clipPath id={`skc${uid}`}>
            <motion.rect x="0" y="0" height={H} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.3, ease: EASE, delay: 0.15 }} />
          </clipPath>
        </defs>

        <g clipPath={`url(#skc${uid})`}>
          {bands.map((bd, j) => (
            <path key={j} d={band(bd.a, bd.b, bd.h)} fill={`url(#sk${uid}-${bd.i})`}
              opacity={hot == null || hot === bd.i ? 1 : 0.25}
              style={{ transition: "opacity .2s" }}
              onPointerEnter={() => setHot(bd.i)} onPointerLeave={() => setHot(null)} />
          ))}
        </g>

        {data.map((d, i) => (
          <g key={d.name} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)} className="cursor-default">
            <rect x={x0 - NODE} y={left[i].y} width={NODE} height={Math.max(2, left[i].h)} rx={3} fill={PALETTE[i % PALETTE.length]} />
            <text x={x0 - NODE - 10} y={left[i].y + left[i].h / 2 - 6} textAnchor="end" dominantBaseline="central" className="fill-ink" style={{ fontSize: 12.5, fontWeight: 700 }}>
              {d.name.length > 24 ? d.name.slice(0, 23) + "…" : d.name}
            </text>
            <text x={x0 - NODE - 10} y={left[i].y + left[i].h / 2 + 9} textAnchor="end" dominantBaseline="central" className="fill-ink-muted tabular-nums" style={{ fontSize: 11 }}>
              {d.leads} leads · {d.leads ? Math.round((d.won / d.leads) * 100) : 0}% gana
            </text>
          </g>
        ))}

        <rect x={x1} y={rWon.y} width={NODE} height={Math.max(2, rWon.h)} rx={3} fill="#16a34a" />
        <text x={x1 + NODE + 10} y={rWon.y + rWon.h / 2 - 7} dominantBaseline="central" className="fill-ink" style={{ fontSize: 12.5, fontWeight: 700 }}>Ganadas · {won}</text>
        <text x={x1 + NODE + 10} y={rWon.y + rWon.h / 2 + 9} dominantBaseline="central" className="fill-ink-muted tabular-nums" style={{ fontSize: 11 }}>{money(ingresos)}</text>
        <rect x={x1} y={rOpen.y} width={NODE} height={Math.max(2, rOpen.h)} rx={3} fill="#94a3b8" />
        <text x={x1 + NODE + 10} y={rOpen.y + rOpen.h / 2} dominantBaseline="central" className="fill-ink" style={{ fontSize: 12.5, fontWeight: 700 }}>Sin cerrar · {total - won}</text>
      </svg>
    </HorizontalScrollArea>
  );
}
