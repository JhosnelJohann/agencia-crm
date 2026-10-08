"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { EASE, EmptyState, Modal, ModuleHero, Panel, Pill, StatTile, api, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";

/**
 * Redes sociales (Módulo 7): panel de SOLO LECTURA sobre Metricool. No se gestiona ni publica desde aquí:
 * se conecta la cuenta, se listan las marcas y sus redes, y se abre Metricool para lo demás. (Beta.)
 */
interface Cuenta { id: string; nombre: string; external_user_id: string | null; blog_id: string | null; conectado: string; tiene_token: boolean; perfiles: any; actualizado: string | null; }
const VACIA = { nombre: "", user_token: "", external_user_id: "", blog_id: "" };

/** Los perfiles de Metricool traen, por marca, las redes conectadas como campos `facebook`, `instagram`, etc. */
const REDES: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", twitter: "X", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok", pinterest: "Pinterest", twitch: "Twitch", threads: "Threads", bluesky: "Bluesky", gmb: "Google Business", web: "Sitio web" };
const marcas = (p: any): any[] => (Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : []);
const redesDe = (m: any) => Object.keys(REDES).filter((k) => m?.[k]);

export default function RedesPage() {
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [form, setForm] = useState<typeof VACIA | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const cargar = useCallback(async () => { try { setCuentas((await api("/api/marketing/redes/cuentas")).cuentas); } catch (e: any) { toast.error(e.message); setCuentas([]); } }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const conectar = async () => {
    if (!form) return;
    if (form.nombre.trim().length < 2 || form.user_token.trim().length < 10 || !/^\d+$/.test(form.external_user_id.trim())) { toast.error("Nombre, token y userId (numérico) son obligatorios"); return; }
    setSaving(true);
    try {
      const r = await api("/api/marketing/redes/cuentas", { method: "POST", body: JSON.stringify({ nombre: form.nombre.trim(), user_token: form.user_token.trim(), external_user_id: form.external_user_id.trim(), blog_id: form.blog_id.trim() || undefined }) });
      if (r.conexion === "ok") toast.success("Conectado con Metricool"); else toast.error(`Guardada, pero Metricool respondió: ${r.detalle}`);
      setForm(null); cargar();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const actualizar = async (c: Cuenta) => { setBusy(c.id); try { await api(`/api/marketing/redes/cuentas/${c.id}/actualizar`, { method: "POST" }); toast.success("Actualizado"); } catch (e: any) { toast.error(e.message); } finally { setBusy(null); cargar(); } };
  const quitar = async (c: Cuenta) => { if (!confirm(`¿Desconectar «${c.nombre}»? Se elimina el token guardado.`)) return; try { await api(`/api/marketing/redes/cuentas/${c.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };

  const todas = (cuentas || []).flatMap((c) => marcas(c.perfiles));
  const totalRedes = todas.reduce((n, m) => n + redesDe(m).length, 0);

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <ModuleHero icon={{ brand: "instagram" }} kicker="Marketing · reputación" title="Redes" accent="sociales" subtitle="Tus marcas y redes conectadas en Metricool, en un solo lugar. Panel de lectura: la gestión y publicación siguen en Metricool.">
          <StatTile label="Cuentas" value={cuentas ? cuentas.length : null} icon="link" />
          <StatTile label="Marcas" value={cuentas ? todas.length : null} icon="crown" tone="accent" delay={0.06} />
          <StatTile label="Redes conectadas" value={cuentas ? totalRedes : null} icon="globe_showing_americas" tone="good" delay={0.12} />
          <button onClick={() => setForm({ ...VACIA })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Conectar Metricool</button>
        </ModuleHero>

        {cuentas === null ? (
          <div className="grid md:grid-cols-2 gap-5">{[0, 1].map((i) => <div key={i} className="glass-3d rounded-[24px] h-56 skeleton" />)}</div>
        ) : cuentas.length === 0 ? (
          <div className="glass-3d rounded-[28px]"><EmptyState icon="loudspeaker" title="Conecta Metricool" text="Necesitas tu userToken y tu userId (Metricool → Cuenta → API). Con eso GOZZ lista tus marcas y las redes que tienen conectadas." action={<button onClick={() => setForm({ ...VACIA })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Conectar Metricool</button>} /></div>
        ) : (
          <div className="space-y-5">
            {cuentas.map((c, i) => (
              <Panel key={c.id} kicker={`Metricool · userId ${c.external_user_id}`} title={c.nombre} icon="loudspeaker" delay={0.05 * i}
                right={<div className="flex items-center gap-2">
                  <button onClick={() => actualizar(c)} disabled={busy === c.id} className={btnGhost + " !h-9 !px-4 !rounded-xl !text-xs"}>{busy === c.id ? "Actualizando…" : "Actualizar"}</button>
                  <a href="https://app.metricool.com" target="_blank" rel="noreferrer" className={btnGhost + " !h-9 !px-4 !rounded-xl !text-xs"}>Abrir Metricool ↗</a>
                  <button onClick={() => quitar(c)} aria-label="Desconectar" className="h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center"><Trash className="h-4 w-4" /></button>
                </div>}>
                {marcas(c.perfiles).length === 0 ? (
                  <p className="text-sm text-ink-muted py-4">{c.actualizado ? "Metricool no devolvió marcas para esta cuenta." : "Aún no hay datos. Pulsa «Actualizar»."}</p>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {marcas(c.perfiles).map((m: any, j: number) => (
                      <motion.div key={m.id ?? j} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * j, ease: EASE, duration: 0.6 }} className="rounded-2xl border border-line bg-white/[0.03] p-5">
                        <div className="flex items-center gap-3"><AppIcon name="crown" size={38} /><div className="font-display font-extrabold text-2xl text-ink truncate">{m.label || m.title || m.name || `Marca ${m.id}`}</div></div>
                        <div className="mt-3 flex flex-wrap gap-1.5">{redesDe(m).length ? redesDe(m).map((k) => <Pill key={k} tone="accent">{REDES[k]}</Pill>) : <Pill>sin redes</Pill>}</div>
                        {m.timezone && <div className="mt-3 text-xs text-ink-muted">Zona horaria: {m.timezone}</div>}
                      </motion.div>
                    ))}
                  </div>
                )}
                {c.actualizado && <div className="mt-4 text-xs text-ink-muted">Actualizado {new Date(c.actualizado).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
              </Panel>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title="Conectar Metricool" icon="loudspeaker">
        {form && (
          <div className="space-y-4">
            <div><label className={labelCls}>Nombre</label><input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Agencia GOZZ" /></div>
            <div><label className={labelCls}>userToken</label><input type="password" autoComplete="off" className={inputCls} value={form.user_token} onChange={(e) => setForm({ ...form, user_token: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>userId</label><input className={inputCls} value={form.external_user_id} onChange={(e) => setForm({ ...form, external_user_id: e.target.value })} placeholder="1234567" /></div>
              <div><label className={labelCls}>blogId (opcional)</label><input className={inputCls} value={form.blog_id} onChange={(e) => setForm({ ...form, blog_id: e.target.value })} /></div>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">El token se guarda cifrado y no vuelve a mostrarse. La API de Metricool requiere un plan que la incluya.</p>
            <div className="flex justify-end gap-3 pt-1"><button onClick={() => setForm(null)} className={btnGhost}>Cancelar</button><button onClick={conectar} disabled={saving} className={btnAurora}>{saving ? "Conectando…" : "Conectar"}</button></div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
