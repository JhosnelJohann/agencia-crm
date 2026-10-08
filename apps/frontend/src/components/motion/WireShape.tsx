"use client";
import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useMotionOk } from "./useMotionOk";

/**
 * Poliedros de alambre en SVG (la familia del icosaedro de la escena 3D del login, sin WebGL).
 * Se proyectan con perspectiva y se dibujan en DOS paths (aristas de delante y de detrás, con distinta
 * opacidad) + uno de vértices: tres nodos SVG por forma, actualizados por ref a ~30 fps, sin re-render
 * de React. Gira solo si useMotionOk() y la forma está en pantalla; si no, queda estática y legible.
 */
export type WireKind = "icosahedron" | "octahedron" | "dodecahedron" | "cube" | "torus" | "globe";

type V = [number, number, number];
type Geo = { v: V[]; e: [number, number][] };

const norm = (p: V): V => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
const mid = (a: V, b: V): V => norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);

/** Aristas = pares de vértices a la distancia mínima (vale para sólidos regulares). */
function edgesByMinDist(v: V[]): [number, number][] {
  let min = Infinity;
  const d = (i: number, j: number) => Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) min = Math.min(min, d(i, j));
  const e: [number, number][] = [];
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (d(i, j) < min * 1.01) e.push([i, j]);
  return e;
}

function icosahedron(): Geo {
  const t = (1 + Math.sqrt(5)) / 2;
  const base: V[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as V[]).map(norm);
  const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  // Una subdivisión (detalle 1), como IcosahedronGeometry(1, 1) del login.
  const v: V[] = [...base];
  const key = new Map<string, number>();
  const at = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!key.has(k)) { key.set(k, v.length); v.push(mid(v[a], v[b])); }
    return key.get(k)!;
  };
  const e = new Set<string>();
  const add = (a: number, b: number) => e.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  for (const [a, b, c] of faces) {
    const ab = at(a, b), bc = at(b, c), ca = at(c, a);
    for (const [x, y, z] of [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]) { add(x, y); add(y, z); add(z, x); }
  }
  return { v, e: [...e].map((s) => s.split("-").map(Number) as [number, number]) };
}

function octahedron(): Geo {
  const v: V[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  return { v, e: edgesByMinDist(v) };
}

function cube(): Geo {
  const v: V[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push(norm([x, y, z]));
  return { v, e: edgesByMinDist(v) };
}

function dodecahedron(): Geo {
  const p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
  const v: V[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { v.push([0, a * q, b * p]); v.push([a * q, b * p, 0]); v.push([a * p, 0, b * q]); }
  const n = v.map(norm);
  return { v: n, e: edgesByMinDist(n) };
}

function torus(): Geo {
  const R = 0.72, r = 0.3, M = 18, N = 8;
  const v: V[] = [], e: [number, number][] = [];
  for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
    const u = (i / M) * Math.PI * 2, w = (j / N) * Math.PI * 2;
    v.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]);
    const k = i * N + j;
    e.push([k, i * N + ((j + 1) % N)], [k, ((i + 1) % M) * N + j]);
  }
  return { v, e };
}

function globe(): Geo {
  const LAT = 6, LON = 10, SEG = 20;
  const v: V[] = [], e: [number, number][] = [];
  for (let a = 1; a < LAT; a++) { // paralelos
    const phi = (a / LAT) * Math.PI - Math.PI / 2, s = v.length;
    for (let i = 0; i < SEG; i++) { const t = (i / SEG) * Math.PI * 2; v.push([Math.cos(phi) * Math.cos(t), Math.sin(phi), Math.cos(phi) * Math.sin(t)]); e.push([s + i, s + ((i + 1) % SEG)]); }
  }
  for (let b = 0; b < LON; b++) { // meridianos
    const t = (b / LON) * Math.PI, s = v.length;
    for (let i = 0; i <= SEG; i++) { const phi = (i / SEG) * Math.PI * 2; v.push([Math.cos(phi) * Math.cos(t), Math.sin(phi), Math.cos(phi) * Math.sin(t)]); if (i) e.push([s + i - 1, s + i]); }
  }
  return { v, e };
}

const GEOS: Record<WireKind, () => Geo> = { icosahedron, octahedron, dodecahedron, cube, torus, globe };
const cache = new Map<WireKind, Geo>();
const geoOf = (k: WireKind) => { if (!cache.has(k)) cache.set(k, GEOS[k]()); return cache.get(k)!; };
const DOTS: Record<WireKind, boolean> = { icosahedron: true, octahedron: true, dodecahedron: true, cube: true, torus: false, globe: false };

/** Proyecta la forma con rotación (ax, ay) y devuelve los tres `d` (delante, detrás, vértices). */
function frame(g: Geo, ax: number, ay: number, size: number, dots: boolean) {
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
  const half = size / 2, rad = size * 0.4, cam = 3.2;
  const p = g.v.map(([x, y, z]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    const k = cam / (cam - z2);
    return [half + x1 * rad * k, half - y2 * rad * k, z2] as const;
  });
  let front = "", back = "", pts = "";
  for (const [a, b] of g.e) {
    const s = `M${p[a][0].toFixed(1)} ${p[a][1].toFixed(1)}L${p[b][0].toFixed(1)} ${p[b][1].toFixed(1)}`;
    if (p[a][2] + p[b][2] >= 0) front += s; else back += s;
  }
  if (dots) for (const q of p) if (q[2] > -0.2) pts += `M${q[0].toFixed(1)} ${q[1].toFixed(1)}h0`;
  return { front, back, pts };
}

export function WireShape({
  kind = "icosahedron", size = 220, speed = 1, className, strokeWidth = 1,
}: { kind?: WireKind; size?: number; speed?: number; className?: string; strokeWidth?: number }) {
  const motionOk = useMotionOk();
  const uid = useId().replace(/:/g, "");
  const host = useRef<SVGSVGElement>(null);
  const fr = useRef<SVGPathElement>(null), bk = useRef<SVGPathElement>(null), dt = useRef<SVGPathElement>(null);
  const g = geoOf(kind);
  const dots = DOTS[kind];
  const still = useMemo(() => frame(g, -0.45, 0.6, size, dots), [g, size, dots]);

  useEffect(() => {
    const svg = host.current;
    if (!motionOk || !svg) return;
    let raf = 0, last = 0, ax = -0.45, ay = 0.6, onScreen = true;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const io = new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; });
    io.observe(svg);
    const onMove = (e: PointerEvent) => { tilt.tx = (e.clientY / window.innerHeight - 0.5) * 0.5; tilt.ty = (e.clientX / window.innerWidth - 0.5) * 0.6; };
    window.addEventListener("pointermove", onMove, { passive: true });
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || t - last < 33) return; // ~30 fps: sobra para un giro lento
      const dtSec = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      ay += dtSec * 0.22 * speed; ax += dtSec * 0.07 * speed;
      tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
      const f = frame(g, ax + tilt.x, ay + tilt.y, size, dots);
      fr.current?.setAttribute("d", f.front);
      bk.current?.setAttribute("d", f.back);
      dt.current?.setAttribute("d", f.pts);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, [motionOk, g, size, speed, dots]);

  return (
    <svg ref={host} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("pointer-events-none select-none", className)} aria-hidden>
      <defs>
        <linearGradient id={`w${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb37a" />
          <stop offset="0.55" stopColor="#f08a5a" />
          <stop offset="1" stopColor="#e8581a" />
        </linearGradient>
      </defs>
      <path ref={bk} d={still.back} fill="none" stroke={`url(#w${uid})`} strokeWidth={strokeWidth} strokeOpacity={0.22} />
      <path ref={fr} d={still.front} fill="none" stroke={`url(#w${uid})`} strokeWidth={strokeWidth} strokeOpacity={0.8} strokeLinecap="round" />
      {dots && <path ref={dt} d={still.pts} fill="none" stroke="#ffb37a" strokeWidth={strokeWidth * 3.2} strokeLinecap="round" />}
    </svg>
  );
}
