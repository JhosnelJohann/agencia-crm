"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/AppShell";
import { RecognitionsBanner } from "@/components/dashboard/RecognitionsBanner";
import { NumberTicker } from "@/components/magic/NumberTicker";
import { ClientesGanadosCard } from "@/components/ClientesGanadosCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { useCurrentUser } from "@/lib/auth-user";
import { useFx } from "@/components/magic/fx";
import { ETAPAS } from "@/lib/etapas";
import { AreaChart } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

interface Stats {
  contactos: number;
  oportunidades: number;
  en_progreso: number;
  sla_vencido: number;
  tareas_pendientes: number;
  usuarios_activos: number;
  por_etapa?: Record<string, number>;
  por_sla?: Record<string, number>;
  valor_total?: number;
  balance_total?: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const money = (n: number) => "$" + Math.round(n).toLocaleString("es");

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Tarjeta de cristal con inclinación 3D (se desactiva sola si los efectos están apagados). */
function Glass({ children, className, delay = 0, tilt = true }: { children: React.ReactNode; className?: string; delay?: number; tilt?: boolean }) {
  const [fx] = useFx();
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={cn("glass-3d h-full rounded-[28px]", className)}
    >
      {children}
    </motion.div>
  );
  if (!fx || !tilt) return inner;
  return (
    <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} perspective={1400} scale={1.008} transitionSpeed={900} glareEnable glareMaxOpacity={0.07} glareColor="#ff9a4d" className="h-full [transform-style:preserve-3d]">
      {inner}
    </Tilt>
  );
}

/** Medidor radial animado (SVG). */
function Gauge({ pct, size = 190 }: { pct: number; size?: number }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <defs>
        <linearGradient id="g-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb37a" />
          <stop offset="0.5" stopColor="#e8581a" />
          <stop offset="1" stopColor="#b8460f" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(226, 232, 240,0.07)" strokeWidth="12" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#g-grad)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - p) }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        style={{ filter: "drop-shadow(0 0 10px rgba(232,88,26,0.65))" }}
      />
    </svg>
  );
}

const QUICK: { href: string; label: string; hint: string; icon: Icon3DName }[] = [
  { href: "/oportunidades", label: "Pipeline", hint: "Mueve tus oportunidades", icon: "bullseye" },
  { href: "/contactos", label: "Contactos", hint: "Leads y clientes", icon: "identification_card" },
  { href: "/whatsapp", label: "WhatsApp", hint: "Conversaciones en vivo", icon: "mobile_phone" },
  { href: "/tareas", label: "Tareas", hint: "Lo que toca hoy", icon: "check_mark_button" },
  { href: "/automatizaciones", label: "Automatizar", hint: "Agentes y reglas", icon: "high_voltage" },
  { href: "/reportes", label: "Reportes", hint: "Números del equipo", icon: "chart_increasing" },
];

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [mk, setMk] = useState<any>(null);
  const [calientes, setCalientes] = useState<any[] | null>(null);
  // Saludo y fecha dependen de la hora LOCAL del navegador: se calculan tras montar. Si se pintan en el
  // SSR salen con la zona del VPS (Europe/Berlin), no coinciden al hidratar y React re-renderiza toda la app.
  const [hoy, setHoy] = useState<{ fecha: string; saludo: string } | null>(null);
  useEffect(() => {
    setHoy({ fecha: new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" }), saludo: saludo() });
  }, []);

  useEffect(() => {
    // PERF: los desgloses (por etapa, SLA, totales) vienen calculados en /api/stats (server-side).
    fetch("/api/stats").then((r) => r.json()).then((d) => setStats(d.stats)).catch(() => {});
    fetch("/api/notificaciones").then((r) => r.json()).then((d) => setNotifs(d.notificaciones || [])).catch(() => {});
    fetch("/api/marketing/resumen").then((r) => r.json()).then(setMk).catch(() => {});
    fetch("/api/marketing/scoring/ranking?limit=5").then((r) => r.json()).then((d) => setCalientes(d.ranking || [])).catch(() => setCalientes([]));
  }, []);

  const totalValor = stats?.valor_total || 0;
  const balance = stats?.balance_total || 0;
  const cobrado = Math.max(0, totalValor - balance);
  const pctCobrado = totalValor > 0 ? cobrado / totalValor : 0;

  const etapas = ETAPAS.filter((e) => (stats?.por_etapa?.[e.key] || 0) > 0)
    .map((e) => ({ ...e, count: stats?.por_etapa?.[e.key] || 0 }));
  const maxEtapa = Math.max(1, ...etapas.map((e) => e.count));

  const sla = stats?.por_sla || {};
  const bySLA = [
    { name: "A tiempo", value: sla["on_track"] || 0, color: "#16b91a" },
    { name: "Atención", value: sla["warning"] || 0, color: "#f0b040" },
    { name: "Vencido", value: sla["vencido"] || 0, color: "#e30b0b" },
    { name: "Cerrado", value: sla["completado"] || 0, color: "#94a3b8" },
  ].filter((s) => s.value > 0);
  const slaTotal = bySLA.reduce((a, b) => a + b.value, 0);

  const kpis: { label: string; value: number | null; icon: Icon3DName; sub: string; ratio: number; href: string; danger?: boolean }[] = [
    { label: "Contactos", value: stats ? stats.contactos : null, icon: "identification_card", sub: "en tu base", ratio: 1, href: "/contactos" },
    { label: "Oportunidades", value: stats ? stats.oportunidades : null, icon: "bullseye", sub: `${stats?.en_progreso ?? 0} en progreso`, ratio: stats && stats.oportunidades ? stats.en_progreso / stats.oportunidades : 0, href: "/oportunidades" },
    { label: "Tareas pendientes", value: stats ? stats.tareas_pendientes : null, icon: "check_mark_button", sub: "por completar", ratio: stats && stats.tareas_pendientes ? Math.min(1, stats.tareas_pendientes / 40) : 0, href: "/tareas" },
    { label: "SLA vencido", value: stats ? stats.sla_vencido : null, icon: "alarm_clock", sub: "requieren atención", ratio: stats && stats.oportunidades ? stats.sla_vencido / stats.oportunidades : 0, href: "/oportunidades", danger: true },
  ];

  const firstName = (user?.nombre || "").split(" ")[0];

  return (
    <AppShell>
      <div className="px-3.5 lg:px-5 pt-5 pb-14 max-w-[1500px] mx-auto space-y-5">
        {/* ─── HÉROE + MEDIDOR ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-8">
            <Glass className="relative overflow-hidden p-7 sm:p-10 min-h-[300px]" tilt={false}>
              <div className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(232,88,26,0.30), rgba(232,88,26,0.06) 55%, transparent 75%)" }} />
              {/* Iconos 3D flotantes */}
              <div className="pointer-events-none absolute right-6 top-6 hidden md:block">
                <div className="relative h-[230px] w-[300px]">
                  <div className="absolute right-2 top-2"><Icon3D name="rocket" size={118} float /></div>
                  <div className="absolute left-4 top-24" style={{ animationDelay: "-1.6s" }}><Icon3D name="trophy" size={78} float /></div>
                  <div className="absolute right-32 bottom-0" style={{ animationDelay: "-3s" }}><Icon3D name="sparkles" size={62} float /></div>
                  <div className="absolute left-20 top-0" style={{ animationDelay: "-2.2s" }}><Icon3D name="gem_stone" size={48} float /></div>
                </div>
              </div>

              <div className="relative max-w-2xl">
                <div className="kicker">{hoy?.fecha ?? " "}</div>
                <h1 className="mt-4 text-[clamp(38px,6vw,76px)] leading-[0.98]">
                  {hoy?.saludo ?? "Hola"},<br />
                  <span className="text-shimmer">{firstName || "equipo"}</span><span className="text-brand-orange text-orange-glow">.</span>
                </h1>
                <p className="mt-5 max-w-md text-[15px] text-ink-sub leading-relaxed">
                  Tu operación de marketing en una sola vista: leads, campañas, conversaciones y resultados en tiempo real.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/oportunidades" className="btn-aurora h-12 px-6 rounded-2xl text-white font-bold text-[15px] inline-flex items-center gap-2">
                    Nueva oportunidad <span aria-hidden>→</span>
                  </Link>
                  <Link href="/tareas" className="h-12 px-6 rounded-2xl border border-line bg-white/[0.04] hover:bg-white/[0.08] hover:border-brand-primary/30 text-ink font-bold text-[15px] inline-flex items-center gap-2 transition">
                    Ver mis tareas
                  </Link>
                </div>
              </div>
            </Glass>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <Glass className="p-7 flex flex-col items-center justify-between min-h-[300px]" delay={0.1}>
              <div className="w-full flex items-center justify-between">
                <div className="kicker">Cobranza</div>
                <Icon3D name="money_bag" size={34} float />
              </div>
              <div className="relative my-2">
                <Gauge pct={pctCobrado} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display font-extrabold text-[44px] leading-none tabular-nums text-ink">
                    <NumberTicker value={stats ? Math.round(pctCobrado * 100) : null} suffix="%" />
                  </div>
                  <div className="mt-1 text-[10.5px] uppercase tracking-[2.4px] text-ink-muted font-semibold">cobrado</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full text-center">
                <div className="rounded-2xl bg-white/[0.04] border border-line py-2.5">
                  <div className="text-[10px] uppercase tracking-[2px] text-ink-muted font-semibold">Facturado</div>
                  <div className="font-display font-bold text-xl text-ink tabular-nums">{money(totalValor)}</div>
                </div>
                <div className="rounded-2xl bg-brand-primary/10 border border-brand-primary/25 py-2.5">
                  <div className="text-[10px] uppercase tracking-[2px] text-brand-primary font-semibold">Por cobrar</div>
                  <div className="font-display font-bold text-xl text-ink tabular-nums">{money(balance)}</div>
                </div>
              </div>
            </Glass>
          </div>
        </div>

        {/* ─── INDICADORES ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {kpis.map((k, i) => (
            <Link key={k.label} href={k.href} className="group block">
              <Glass className="p-5 sm:p-6 relative overflow-hidden" delay={0.12 + i * 0.07}>
                <div className="flex items-start justify-between">
                  <Icon3D name={k.icon} size={54} float />
                  <span className="text-ink-muted group-hover:text-brand-primary transition-colors text-lg leading-none">↗</span>
                </div>
                <div className="mt-5 font-display font-extrabold text-[52px] leading-none tabular-nums text-ink">
                  <NumberTicker value={k.value} />
                </div>
                <div className="mt-2 text-[13px] font-bold uppercase tracking-[2px] text-ink">{k.label}</div>
                <div className="text-xs text-ink-muted">{k.sub}</div>
                <div className="mt-4 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(4, Math.min(100, k.ratio * 100))}%` }}
                    transition={{ duration: 1.3, ease: EASE, delay: 0.4 + i * 0.07 }}
                    className={cn("h-full rounded-full", k.danger ? "bg-gradient-to-r from-brand-red to-orange-500" : "bg-gradient-to-r from-brand-gold via-brand-primary to-orange-300")}
                  />
                </div>
              </Glass>
            </Link>
          ))}
        </div>

        {/* ─── MARKETING ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-8">
            <Glass className="p-7" delay={0.14} tilt={false}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Icon3D name="satellite_antenna" size={40} float />
                  <div><div className="kicker !text-[10.5px]">Marketing · 30 días</div><h2 className="mt-1 text-[30px] leading-none text-ink">Captación de leads</h2></div>
                </div>
                <div className="flex items-center gap-6">
                  {[["Vistas", mk?.kpis?.vistas_30d], ["Envíos", mk?.kpis?.envios_30d], ["Conversión", mk?.kpis && mk.kpis.vistas_30d > 0 ? `${Math.round((mk.kpis.envios_30d / mk.kpis.vistas_30d) * 1000) / 10}%` : "0%"]].map(([l, v]) => (
                    <div key={String(l)} className="text-right"><div className="font-display font-extrabold text-[34px] leading-none tabular-nums text-ink">{v ?? "–"}</div><div className="text-[10px] uppercase tracking-[2px] text-ink-muted font-semibold">{l}</div></div>
                  ))}
                </div>
              </div>
              {mk?.serie ? <AreaChart data={mk.serie} a="envios" b="vistas" labelA="Envíos de formulario" labelB="Vistas" /> : <div className="h-[190px] skeleton rounded-2xl" />}
            </Glass>
          </div>
          <div className="col-span-12 xl:col-span-4">
            <Glass className="p-7 h-full" delay={0.2} tilt={false}>
              <div className="flex items-center justify-between mb-4"><div className="kicker">Leads calientes</div><Link href="/scoring" className="text-xs font-bold uppercase tracking-[2px] text-brand-primary hover:brightness-125">Ver todo →</Link></div>
              {calientes === null ? <div className="h-40 skeleton rounded-2xl" /> : calientes.length === 0 ? (
                <div className="py-8 text-center text-ink-muted text-sm"><Icon3D name="fire" size={56} float /><p className="mt-3">Cuando lleguen leads con puntos, los más calientes aparecerán aquí.</p></div>
              ) : (
                <ul className="space-y-2.5">
                  {calientes.map((r: any, i: number) => (
                    <li key={r.contacto_id}>
                      <Link href={`/contactos/${r.contacto_id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand-primary/30 px-3.5 py-2.5 transition">
                        <span className="font-display font-extrabold text-xl text-ink-muted w-5">{i + 1}</span>
                        <div className="min-w-0 flex-1"><div className="font-bold text-ink truncate text-sm">{r.nombre_completo}</div><div className="text-[11px] text-ink-muted truncate">{r.empresa || r.email || r.fuente || "—"}</div></div>
                        <div className="font-display font-extrabold text-2xl tabular-nums text-brand-primary">{r.score}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Glass>
          </div>
        </div>

        {/* ─── EMBUDO + SLA ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-8">
            <Glass className="p-7 min-h-[320px]" delay={0.15} tilt={false}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="kicker">Pipeline</div>
                  <h2 className="mt-2 text-[34px] text-ink">Embudo por etapa</h2>
                </div>
                <Icon3D name="chart_increasing" size={48} float />
              </div>
              {etapas.length === 0 ? (
                <div className="py-14 text-center">
                  <Icon3D name="crystal_ball" size={70} float />
                  <div className="mt-3 font-display font-bold text-2xl text-ink uppercase tracking-wide">Tu embudo está listo</div>
                  <p className="text-sm text-ink-muted mt-1">Crea tu primera oportunidad y aparecerá aquí, etapa por etapa.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {etapas.map((e, i) => (
                    <div key={e.key} className="flex items-center gap-4">
                      <div className="w-36 shrink-0 text-[13px] font-bold uppercase tracking-[1.6px] text-ink-sub truncate">{e.label}</div>
                      <div className="flex-1 h-9 rounded-xl bg-white/[0.04] overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(6, (e.count / maxEtapa) * 100)}%` }}
                          transition={{ duration: 1.2, ease: EASE, delay: 0.3 + i * 0.08 }}
                          className="h-full rounded-xl relative"
                          style={{ background: `linear-gradient(90deg, ${e.color}55, ${e.color})`, boxShadow: `0 0 24px -4px ${e.color}88` }}
                        >
                          <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 to-transparent" />
                        </motion.div>
                      </div>
                      <div className="w-12 text-right font-display font-extrabold text-2xl tabular-nums text-ink">{e.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </Glass>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <Glass className="p-7 min-h-[320px] flex flex-col" delay={0.22}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="kicker">Servicio</div>
                  <h2 className="mt-2 text-[34px] text-ink">SLA</h2>
                </div>
                <Icon3D name="hourglass_done" size={44} float />
              </div>
              {slaTotal === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-muted text-sm py-8">
                  <Icon3D name="shield" size={56} float />
                  <p className="mt-3">Sin oportunidades con SLA todavía.</p>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-4">
                  <div className="relative h-[170px] w-[170px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bySLA} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={4} stroke="none" cornerRadius={6} isAnimationActive>
                          {bySLA.map((s) => <Cell key={s.name} fill={s.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="font-display font-extrabold text-4xl text-ink tabular-nums">{slaTotal}</div>
                      <div className="text-[9.5px] uppercase tracking-[2px] text-ink-muted font-semibold">casos</div>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-sm">
                    {bySLA.map((s) => (
                      <li key={s.name} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
                        <span className="text-ink-sub">{s.name}</span>
                        <span className="ml-auto font-bold text-ink tabular-nums pl-3">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Glass>
          </div>
        </div>

        {/* ─── ACCESOS + ACTIVIDAD ─────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 xl:col-span-7">
            <Glass className="p-7" delay={0.1} tilt={false}>
              <div className="kicker mb-5">Accesos rápidos</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK.map((q) => (
                  <Link key={q.href} href={q.href} className="group relative rounded-2xl border border-line bg-white/[0.03] hover:bg-brand-primary/[0.08] hover:border-brand-primary/30 p-4 transition-all duration-300 hover:-translate-y-1">
                    <Icon3D name={q.icon} size={46} />
                    <div className="mt-3 font-display font-bold text-xl uppercase tracking-wide text-ink">{q.label}</div>
                    <div className="text-xs text-ink-muted">{q.hint}</div>
                  </Link>
                ))}
              </div>
            </Glass>
          </div>

          <div className="col-span-12 xl:col-span-5">
            <Glass className="p-7 max-h-[420px] flex flex-col" delay={0.18} tilt={false}>
              <div className="flex items-center justify-between mb-4">
                <div className="kicker">Actividad reciente</div>
                <Icon3D name="bell" size={30} float />
              </div>
              {notifs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-muted text-sm py-8">
                  <Icon3D name="eyes" size={56} float />
                  <p className="mt-3">Todo tranquilo. Cuando pase algo, lo verás aquí.</p>
                </div>
              ) : (
                <ul className="space-y-2 overflow-y-auto pr-1 scrollbar-thin" data-lenis-prevent>
                  {notifs.slice(0, 12).map((n, i) => (
                    <motion.li key={n.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05, ease: EASE }}
                      className="flex items-start gap-3 rounded-2xl p-3 bg-white/[0.03] border border-line">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(232,88,26,0.9)] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-ink truncate">{n.titulo}</div>
                        {n.mensaje && <div className="text-xs text-ink-muted line-clamp-2">{n.mensaje}</div>}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Glass>
          </div>
        </div>

        {/* ─── EQUIPO ─────────────────────────────────────────────────────── */}
        <RecognitionsBanner />
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12">
            <Glass className="overflow-hidden min-h-[380px]" delay={0.1} tilt={false}>
              <ErrorBoundary><ClientesGanadosCard /></ErrorBoundary>
            </Glass>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
