"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { EASE, EmptyState, Modal, ModuleHero, Panel, Pill, StatTile, api, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";

/**
 * Anuncios (Módulo 4): cuentas de Meta Ads (solo lectura), gasto sincronizado, atribución lead → campaña
 * y devolución de conversiones a Meta (Conversions API) para optimizar las campañas.
 */
interface Cuenta { id: string; nombre: string; external_account_id: string; pixel_id: string | null; moneda: string; estado: string; ultima_sync: string | null; ultimo_error: string | null; tiene_token: boolean; tiene_capi: boolean; }
interface Camp { id: string; nombre: string; objetivo: string | null; estado: string | null; gasto: string; impresiones: string; clics: string; leads_meta: number; leads_crm: number; cuenta: string; moneda: string; }
interface Atr { campana: string; fuente: string; leads: number; ganadas: number; ingresos: number; gasto: number; }
const money = (n: number, m = "USD") => new Intl.NumberFormat("es", { style: "currency", currency: m, maximumFractionDigits: 0 }).format(n || 0);
const VACIA = { nombre: "", external_account_id: "", access_token: "", pixel_id: "", capi_token: "" };

export default function AnunciosPage() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [atr, setAtr] = useState<Atr[] | null>(null);
  const [conv, setConv] = useState<any[]>([]);
  const [form, setForm] = useState<typeof VACIA | null>(null);
  const [saving, setSaving] = useState(false);
  const [sync, setSync] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [a, b, c, d] = await Promise.all([api("/api/marketing/anuncios/cuentas"), api("/api/marketing/anuncios/campanas"), api("/api/marketing/anuncios/atribucion"), api("/api/marketing/anuncios/conversiones")]);
      setCuentas(a.cuentas); setCamps(b.campanas); setAtr(c.atribucion); setConv(d.conversiones);
    } catch (e: any) { toast.error(e.message); setCuentas([]); setCamps([]); setAtr([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const tot = useMemo(() => {
    const gasto = (camps || []).reduce((n, c) => n + Number(c.gasto), 0);
    const leads = (atr || []).reduce((n, a) => n + a.leads, 0);
    const ingresos = (atr || []).reduce((n, a) => n + a.ingresos, 0);
    return { gasto, leads, ingresos, cpl: leads ? gasto / leads : 0, roas: gasto ? ingresos / gasto : 0 };
  }, [camps, atr]);

  const conectar = async () => {
    if (!form) return;
    if (form.nombre.trim().length < 2 || !form.external_account_id.trim()) { toast.error("Nombre e ID de la cuenta son obligatorios"); return; }
    setSaving(true);
    try {
      const body: any = { nombre: form.nombre.trim(), external_account_id: form.external_account_id.trim() };
      for (const k of ["access_token", "pixel_id", "capi_token"] as const) if ((form as any)[k].trim()) body[k] = (form as any)[k].trim();
      const r = await api("/api/marketing/anuncios/cuentas", { method: "POST", body: JSON.stringify(body) });
      toast.success("Cuenta guardada"); setForm(null); await cargar();
      if (body.access_token) sincronizar(r.id);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const sincronizar = async (id: string) => {
    setSync(id);
    try { const r = await api(`/api/marketing/anuncios/cuentas/${id}/sincronizar`, { method: "POST" }); toast.success(`Sincronizadas ${r.campanas} campañas`); }
    catch (e: any) { toast.error(e.message); } finally { setSync(null); cargar(); }
  };
  const desconectar = async (c: Cuenta) => { if (!confirm(`¿Desconectar «${c.nombre}»? Se borran sus tokens; el historial de campañas se conserva.`)) return; try { await api(`/api/marketing/anuncios/cuentas/${c.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };

  const hayCuentas = (cuentas || []).length > 0;

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <ModuleHero icon="rocket" kicker="Marketing · inversión" title="Anuncios" accent="y atribución" subtitle="Cuánto gastas en Meta, cuántos leads llegan de cada campaña y cuánto vale ya lo que cerraste.">
          <StatTile label="Gasto · 30 d" value={camps ? Math.round(tot.gasto) : null} prefix="$" icon="money_bag" />
          <StatTile label="Leads (CRM)" value={atr ? tot.leads : null} icon="busts_in_silhouette" tone="accent" delay={0.06} />
          <StatTile label="Costo por lead" value={camps && atr ? Math.round(tot.cpl * 100) / 100 : null} prefix="$" icon="bullseye" delay={0.12} />
          <StatTile label="ROAS" value={camps && atr ? Math.round(tot.roas * 100) / 100 : null} suffix="x" icon="chart_increasing" tone="good" delay={0.18} />
          <button onClick={() => setForm({ ...VACIA })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Conectar cuenta</button>
        </ModuleHero>

        {cuentas && !hayCuentas ? (
          <div className="glass-3d rounded-[28px]">
            <EmptyState icon="satellite_antenna" title="Conecta tu cuenta publicitaria" text="Necesitas el ID de tu cuenta de anuncios (act_…) y un token de acceso de Meta con permiso ads_read. Opcional: el ID del píxel y un token de Conversions API para devolver conversiones." action={<button onClick={() => setForm({ ...VACIA })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Conectar cuenta</button>} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5">
            <Panel className="col-span-12" kicker="Cuentas" title="Conectadas" icon="link" delay={0.04}>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(cuentas || []).map((c) => (
                  <div key={c.id} className="group rounded-2xl border border-line bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="font-display font-extrabold text-2xl text-ink truncate">{c.nombre}</div><div className="text-xs text-ink-muted">{c.external_account_id}</div></div>
                      <Pill tone={c.ultimo_error ? "bad" : c.tiene_token ? "good" : "warn"}>{c.ultimo_error ? "error" : c.tiene_token ? "activa" : "sin token"}</Pill>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone={c.tiene_token ? "good" : "neutral"}>Lectura de gasto</Pill><Pill tone={c.tiene_capi && c.pixel_id ? "good" : "neutral"}>Conversions API</Pill></div>
                    {c.ultimo_error && <div className="mt-3 text-xs text-brand-red break-words">{c.ultimo_error}</div>}
                    <div className="mt-3 text-xs text-ink-muted">{c.ultima_sync ? `Sincronizada ${new Date(c.ultima_sync).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Nunca sincronizada"}</div>
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => sincronizar(c.id)} disabled={!c.tiene_token || sync === c.id} className={btnGhost + " !h-9 !px-4 !rounded-xl !text-xs"}>{sync === c.id ? "Sincronizando…" : "Sincronizar ahora"}</button>
                      <button onClick={() => desconectar(c)} aria-label="Desconectar" className="ml-auto h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="col-span-12 xl:col-span-7" kicker="Meta" title="Campañas" icon="megaphone" delay={0.08}>
              {!camps ? <div className="h-48 skeleton rounded-2xl" /> : camps.length === 0 ? <p className="text-sm text-ink-muted py-6">Sincroniza una cuenta para ver aquí sus campañas y su gasto de los últimos 30 días.</p> : (
                <div className="overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[10.5px] uppercase tracking-[2px] text-ink-muted bg-white/[0.03]"><th className="px-4 py-3">Campaña</th><th className="px-3 py-3 text-right">Gasto</th><th className="px-3 py-3 text-right">Clics</th><th className="px-3 py-3 text-right">Leads Meta</th><th className="px-3 py-3 text-right">Leads CRM</th><th className="px-3 py-3 text-right">CPL real</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {camps.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3"><div className="font-bold text-ink">{c.nombre}</div><div className="text-[11px] text-ink-muted">{c.cuenta} · {c.estado}</div></td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink">{money(Number(c.gasto), c.moneda)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-sub">{Number(c.clics).toLocaleString("es")}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-sub">{c.leads_meta}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-bold text-brand-primary">{c.leads_crm}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink">{c.leads_crm ? money(Number(c.gasto) / c.leads_crm, c.moneda) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel className="col-span-12 xl:col-span-5" kicker="CRM" title="Atribución de leads" icon="bullseye" delay={0.12}>
              {!atr ? <div className="h-48 skeleton rounded-2xl" /> : atr.length === 0 ? <p className="text-sm text-ink-muted py-6">Cuando lleguen leads por formularios con UTM (<code className="text-brand-primary">?utm_campaign=…</code>), verás aquí de qué campaña vinieron y cuánto valen.</p> : (
                <ul className="space-y-2.5">
                  {atr.map((a, i) => (
                    <motion.li key={a.campana + a.fuente} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, ease: EASE }} className="rounded-2xl border border-line bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3"><div className="font-bold text-ink truncate">{a.campana}</div><Pill tone="accent">{a.fuente}</Pill></div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                        {[["Leads", a.leads], ["Ganadas", a.ganadas], ["Ingresos", money(a.ingresos)], ["Gasto", a.gasto ? money(a.gasto) : "—"]].map(([l, v]) => <div key={String(l)}><div className="font-display font-extrabold text-xl text-ink tabular-nums">{v}</div><div className="text-[9.5px] uppercase tracking-[1.6px] text-ink-muted font-semibold">{l}</div></div>)}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="col-span-12" kicker="Conversions API" title="Conversiones enviadas a Meta" icon="satellite_antenna" delay={0.16}>
              {conv.length === 0 ? <p className="text-sm text-ink-muted py-4">Sin envíos todavía. Con un píxel y un token de Conversions API, cada formulario envía «Lead», una reunión agendada envía «Schedule» y una venta ganada envía «Purchase».</p> : (
                <div className="overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full text-sm"><tbody className="divide-y divide-line">
                    {conv.map((c) => (
                      <tr key={c.id}><td className="px-4 py-2.5 font-bold text-ink">{c.evento}</td><td className="px-4 py-2.5 text-ink-sub">{c.nombre_completo || "—"}</td><td className="px-4 py-2.5"><Pill tone={c.estado === "enviado" ? "good" : c.estado === "fallido" ? "bad" : "neutral"}>{c.estado}</Pill></td><td className="px-4 py-2.5 text-xs text-ink-muted">{new Date(c.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td></tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Conectar cuenta de Meta Ads" icon="rocket">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Nombre</label><input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Cuenta principal" /></div>
              <div><label className={labelCls}>ID de la cuenta de anuncios</label><input className={inputCls} value={form.external_account_id} onChange={(e) => setForm({ ...form, external_account_id: e.target.value })} placeholder="act_1234567890" /></div>
            </div>
            <div><label className={labelCls}>Token de acceso (ads_read)</label><input type="password" autoComplete="off" className={inputCls} value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} placeholder="EAAB…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>ID del píxel (opcional)</label><input className={inputCls} value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} placeholder="1234567890123" /></div>
              <div><label className={labelCls}>Token Conversions API (opcional)</label><input type="password" autoComplete="off" className={inputCls} value={form.capi_token} onChange={(e) => setForm({ ...form, capi_token: e.target.value })} /></div>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">Los tokens se guardan cifrados en el servidor y nunca se muestran de nuevo. GOZZ solo <b>lee</b> gasto y resultados: no edita campañas ni presupuestos. Genera el token en el Administrador de negocios de Meta (usuario del sistema).</p>
            <div className="flex justify-end gap-3 pt-1"><button onClick={() => setForm(null)} className={btnGhost}>Cancelar</button><button onClick={conectar} disabled={saving} className={btnAurora}>{saving ? "Conectando…" : "Conectar y sincronizar"}</button></div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
