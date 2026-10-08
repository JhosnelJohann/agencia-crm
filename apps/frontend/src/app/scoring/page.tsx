"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { EASE, EmptyState, Modal, ModuleHero, Panel, Pill, StatTile, Switch, api, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

/** Lead scoring (Módulo 6): reglas evento → puntos y ranking de contactos por temperatura. */
interface Regla { id: string; nombre: string; evento: string; puntos: number; condicion: Record<string, string>; activo: boolean; }
interface Rank { contacto_id: string; score: number; nombre_completo: string; email: string | null; empresa: string | null; fuente: string | null; }
const VACIA = { id: "", nombre: "", evento: "form_submitted", puntos: 10, cond_campo: "", cond_valor: "", activo: true };

const temp = (s: number) => (s >= 60 ? { l: "Caliente", tone: "bad" as const, icon: "fire" as const } : s >= 25 ? { l: "Tibio", tone: "warn" as const, icon: "sparkles" as const } : { l: "Frío", tone: "neutral" as const, icon: "hourglass_done" as const });

export default function ScoringPage() {
  const [reglas, setReglas] = useState<Regla[] | null>(null);
  const [rank, setRank] = useState<{ ranking: Rank[]; distribucion: { calientes: number; tibios: number; frios: number } } | null>(null);
  const [tipos, setTipos] = useState<{ tipo: string; nombre: string }[]>([]);
  const [edit, setEdit] = useState<typeof VACIA | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [r, k, t] = await Promise.all([api("/api/marketing/scoring/reglas"), api("/api/marketing/scoring/ranking?limit=30"), api("/api/marketing/eventos/tipos")]);
      setReglas(r.reglas); setRank(k); setTipos(t.tipos);
    } catch (e: any) { toast.error(e.message); setReglas([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const nombreEvento = (t: string) => tipos.find((x) => x.tipo === t)?.nombre || t;
  const d = rank?.distribucion;
  const total = d ? d.calientes + d.tibios + d.frios : 0;

  const guardar = async () => {
    if (!edit) return;
    if (edit.nombre.trim().length < 2) { toast.error("Ponle nombre a la regla"); return; }
    setSaving(true);
    try {
      const body = { nombre: edit.nombre.trim(), evento: edit.evento, puntos: Number(edit.puntos), activo: edit.activo, condicion: edit.cond_campo ? { [edit.cond_campo.trim()]: edit.cond_valor } : {} };
      if (edit.id) await api(`/api/marketing/scoring/reglas/${edit.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/marketing/scoring/reglas", { method: "POST", body: JSON.stringify(body) });
      toast.success("Regla guardada"); setEdit(null); cargar();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const toggle = async (r: Regla, activo: boolean) => { try { await api(`/api/marketing/scoring/reglas/${r.id}`, { method: "PATCH", body: JSON.stringify({ activo }) }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const archivar = async (r: Regla) => { if (!confirm(`¿Desactivar "${r.nombre}"? Los puntos ya dados se conservan.`)) return; try { await api(`/api/marketing/scoring/reglas/${r.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <ModuleHero shape="icosahedron" icon="fire" kicker="Marketing · calificación" title="Lead" accent="scoring" subtitle="Cada acción de un contacto suma o resta puntos. Tus leads más calientes suben solos al principio de la lista.">
          <StatTile label="Calientes" value={d ? d.calientes : null} icon="fire" tone="bad" />
          <StatTile label="Tibios" value={d ? d.tibios : null} icon="sparkles" tone="accent" delay={0.06} />
          <StatTile label="Fríos" value={d ? d.frios : null} icon="hourglass_done" delay={0.12} />
          <button onClick={() => setEdit({ ...VACIA })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nueva regla</button>
        </ModuleHero>

        <div className="grid grid-cols-12 gap-5">
          <Panel className="col-span-12 xl:col-span-7" kicker="Ranking" title="Contactos por temperatura" icon="trophy" delay={0.05}>
            {!rank ? <div className="h-64 skeleton rounded-2xl" /> : rank.ranking.length === 0 ? (
              <EmptyState icon="crystal_ball" title="Aún nadie tiene puntos" text="Cuando un contacto llene un formulario, escriba por WhatsApp o avance de etapa, aparecerá aquí." />
            ) : (
              <ul className="space-y-2">
                {rank.ranking.map((r, i) => {
                  const t = temp(r.score); const pct = Math.min(100, (r.score / 100) * 100);
                  return (
                    <motion.li key={r.contacto_id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, ease: EASE }}>
                      <Link href={`/contactos/${r.contacto_id}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand-primary/30 p-3.5 transition">
                        <div className="w-8 text-center font-display font-extrabold text-2xl text-ink-muted tabular-nums">{i + 1}</div>
                        <AppIcon name={t.icon} size={34} />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-ink truncate">{r.nombre_completo}</div>
                          <div className="text-xs text-ink-muted truncate">{[r.empresa, r.email].filter(Boolean).join(" · ") || r.fuente || "—"}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.03 }} className="h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-primary to-orange-300" /></div>
                        </div>
                        <div className="text-right"><div className="font-display font-extrabold text-[34px] leading-none tabular-nums text-ink">{r.score}</div><Pill tone={t.tone}>{t.l}</Pill></div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel className="col-span-12 xl:col-span-5" kicker="Motor" title="Reglas de puntos" icon="gear" delay={0.1}
            right={total > 0 ? <span className="text-xs text-ink-muted">{total} contactos con puntos</span> : undefined}>
            {!reglas ? <div className="h-64 skeleton rounded-2xl" /> : (
              <ul className="space-y-2.5">
                {reglas.map((r) => (
                  <li key={r.id} className={cn("group rounded-2xl border border-line bg-white/[0.03] p-4 transition", !r.activo && "opacity-50")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("shrink-0 h-11 w-14 rounded-xl flex items-center justify-center font-display font-extrabold text-xl tabular-nums", r.puntos >= 0 ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red")}>{r.puntos > 0 ? "+" : ""}{r.puntos}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-ink leading-tight">{r.nombre}</div>
                        <div className="text-xs text-ink-muted mt-0.5">cuando: {nombreEvento(r.evento)}{Object.keys(r.condicion || {}).length ? ` · ${Object.entries(r.condicion).map(([k, v]) => `${k}=${v}`).join(", ")}` : ""}</div>
                      </div>
                      <Switch checked={r.activo} onChange={(v) => toggle(r, v)} label="Regla activa" />
                    </div>
                    <div className="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <button onClick={() => setEdit({ id: r.id, nombre: r.nombre, evento: r.evento, puntos: r.puntos, cond_campo: Object.keys(r.condicion || {})[0] || "", cond_valor: Object.values(r.condicion || {})[0] || "", activo: r.activo })} aria-label="Editar" className="h-8 w-8 rounded-lg hover:bg-white/[0.08] flex items-center justify-center"><Pencil className="h-3.5 w-3.5 text-ink-sub" /></button>
                      <button onClick={() => archivar(r)} aria-label="Desactivar" className="h-8 w-8 rounded-lg hover:bg-brand-red/10 text-brand-red flex items-center justify-center"><Trash className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar regla" : "Nueva regla"} icon="fire">
        {edit && (
          <div className="space-y-4">
            <div><label className={labelCls}>Nombre</label><input className={inputCls} value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder="Pidió precio por WhatsApp" /></div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div><label className={labelCls}>Cuando ocurre…</label><select className={inputCls} value={edit.evento} onChange={(e) => setEdit({ ...edit, evento: e.target.value })}>{tipos.map((t) => <option key={t.tipo} value={t.tipo}>{t.nombre}</option>)}</select></div>
              <div><label className={labelCls}>Puntos</label><input type="number" className={inputCls} value={edit.puntos} onChange={(e) => setEdit({ ...edit, puntos: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Solo si el dato…</label><input className={inputCls} value={edit.cond_campo} onChange={(e) => setEdit({ ...edit, cond_campo: e.target.value })} placeholder="hacia  (opcional)" /></div>
              <div><label className={labelCls}>…vale</label><input className={inputCls} value={edit.cond_valor} onChange={(e) => setEdit({ ...edit, cond_valor: e.target.value })} placeholder="ganado" /></div>
            </div>
            <p className="text-xs text-ink-muted">Ejemplo: evento «Cambio de etapa», dato <code className="text-brand-primary">hacia</code> = <code className="text-brand-primary">reunion</code> → +15 puntos cuando alguien agenda reunión.</p>
            <div className="flex items-center gap-3 pt-2">
              <label className="inline-flex items-center gap-3 text-sm text-ink-sub"><Switch checked={edit.activo} onChange={(v) => setEdit({ ...edit, activo: v })} label="Activa" /> Activa</label>
              <div className="ml-auto flex gap-3"><button onClick={() => setEdit(null)} className={btnGhost}>Cancelar</button><button onClick={guardar} disabled={saving} className={btnAurora}>{saving ? "Guardando…" : "Guardar regla"}</button></div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
