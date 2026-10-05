"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";
import { Icon3D } from "@/components/ui/Icon3D";
import { EASE, EmptyState, Modal, ModuleHero, Panel, Pill, StatTile, api, areaCls, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

/**
 * Campañas (Módulo 5): correo masivo a un segmento, con seguimiento de aperturas y clics, baja obligatoria y
 * envío con ritmo suave desde uno de tus buzones. (WhatsApp masivo exige plantillas aprobadas por Meta → llega con el Módulo 3.)
 */
interface Camp {
  id: string; nombre: string; estado: "borrador" | "programada" | "enviando" | "enviada" | "pausada"; asunto: string | null; contenido: string; buzon_id: string | null;
  segmento_id: string | null; segmento_nombre: string | null; total: number; enviados: number; fallidos: number; abiertos: number; clics: number; bajas: number; created_at: string;
}
interface Seg { id: string; nombre: string; reglas: { etiqueta?: string; fuente?: string; tipo_cliente?: string; score_min?: number }; total: number; }
interface Buzon { id: string; email: string; display_name: string | null; auth_type: string; activo: boolean; }
const PLANTILLA_HTML = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;line-height:1.6;color:#222">
  <h2 style="margin:0 0 12px">Hola {{nombre}} 👋</h2>
  <p>Queremos contarte algo que puede ayudarte a crecer tu negocio.</p>
  <p><a href="https://sandrogozz.com" style="background:#e8581a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">Ver más</a></p>
  <p>— Equipo GOZZ</p>
</div>`;
const tonoEstado = (e: Camp["estado"]) => (e === "enviada" ? "good" : e === "enviando" ? "accent" : e === "pausada" ? "warn" : "neutral") as any;
const VACIA = { id: "", nombre: "", segmento_id: "", asunto: "", contenido: PLANTILLA_HTML, buzon_id: "" };

export default function CampanasPage() {
  const [tab, setTab] = useState<"campanas" | "segmentos">("campanas");
  const [camps, setCamps] = useState<Camp[] | null>(null);
  const [segs, setSegs] = useState<Seg[] | null>(null);
  const [buzones, setBuzones] = useState<Buzon[]>([]);
  const [ed, setEd] = useState<typeof VACIA | null>(null);
  const [saving, setSaving] = useState(false);
  const [seg, setSeg] = useState<{ nombre: string; etiqueta: string; fuente: string; tipo_cliente: string; score_min: string } | null>(null);
  const [preview, setPreview] = useState<{ total: number; muestra: any[] } | null>(null);
  const [det, setDet] = useState<{ campana: Camp; destinatarios: any[] } | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [c, s, b] = await Promise.all([api("/api/marketing/campanas"), api("/api/marketing/segmentos"), api("/api/buzones")]);
      setCamps(c.campanas); setSegs(s.segmentos); setBuzones((b.buzones || []).filter((x: Buzon) => x.activo));
    } catch (e: any) { toast.error(e.message); setCamps([]); setSegs([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  // Mientras haya envíos en curso, refresca solo.
  useEffect(() => {
    if (!camps?.some((c) => c.estado === "enviando")) return;
    const t = setInterval(cargar, 4000); return () => clearInterval(t);
  }, [camps, cargar]);

  const kpi = useMemo(() => {
    const env = (camps || []).reduce((n, c) => n + c.enviados, 0);
    const ab = (camps || []).reduce((n, c) => n + c.abiertos, 0);
    const cl = (camps || []).reduce((n, c) => n + c.clics, 0);
    return { env, aperturas: env ? Math.round((ab / env) * 100) : 0, clics: env ? Math.round((cl / env) * 1000) / 10 : 0 };
  }, [camps]);

  const guardar = async (): Promise<string | null> => {
    if (!ed) return null;
    if (ed.nombre.trim().length < 2) { toast.error("Ponle nombre a la campaña"); return null; }
    setSaving(true);
    try {
      const body = { nombre: ed.nombre.trim(), segmento_id: ed.segmento_id || null, asunto: ed.asunto || ed.nombre, contenido: ed.contenido, buzon_id: ed.buzon_id || null };
      if (ed.id) { await api(`/api/marketing/campanas/${ed.id}`, { method: "PATCH", body: JSON.stringify(body) }); cargar(); return ed.id; }
      const r = await api("/api/marketing/campanas", { method: "POST", body: JSON.stringify(body) });
      setEd({ ...ed, id: r.campana.id }); cargar(); return r.campana.id;
    } catch (e: any) { toast.error(e.message); return null; } finally { setSaving(false); }
  };
  const prueba = async () => { const id = await guardar(); if (!id) return; try { const r = await api(`/api/marketing/campanas/${id}/prueba`, { method: "POST" }); toast.success(`Prueba enviada a ${r.enviado_a}`); } catch (e: any) { toast.error(e.message); } };
  const enviar = async () => {
    const id = await guardar(); if (!id) return;
    const s = segs?.find((x) => x.id === ed?.segmento_id);
    if (!confirm(`¿Enviar ahora a ${s ? `${s.total} contactos de «${s.nombre}»` : "TODOS los contactos con correo"}? No se puede deshacer.`)) return;
    try { const r = await api(`/api/marketing/campanas/${id}/enviar`, { method: "POST" }); toast.success(`Enviando a ${r.total} contactos…`); setEd(null); cargar(); } catch (e: any) { toast.error(e.message); }
  };
  const pausar = async (c: Camp) => { try { await api(`/api/marketing/campanas/${c.id}/pausar`, { method: "POST" }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const reanudar = async (c: Camp) => { try { await api(`/api/marketing/campanas/${c.id}/enviar`, { method: "POST" }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const borrar = async (c: Camp) => { if (!confirm(`¿Eliminar el borrador "${c.nombre}"?`)) return; try { await api(`/api/marketing/campanas/${c.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const ver = async (c: Camp) => { try { setDet(await api(`/api/marketing/campanas/${c.id}`)); } catch (e: any) { toast.error(e.message); } };

  const reglasDe = (s: NonNullable<typeof seg>) => ({ ...(s.etiqueta ? { etiqueta: s.etiqueta } : {}), ...(s.fuente ? { fuente: s.fuente } : {}), ...(s.tipo_cliente ? { tipo_cliente: s.tipo_cliente } : {}), ...(Number(s.score_min) > 0 ? { score_min: Number(s.score_min) } : {}) });
  useEffect(() => {
    if (!seg) { setPreview(null); return; }
    const t = setTimeout(() => api("/api/marketing/segmentos/vista-previa", { method: "POST", body: JSON.stringify({ reglas: reglasDe(seg) }) }).then(setPreview).catch(() => setPreview(null)), 350);
    return () => clearTimeout(t);
  }, [seg]);
  const guardarSeg = async () => {
    if (!seg) return; if (seg.nombre.trim().length < 2) { toast.error("Ponle nombre al segmento"); return; }
    try { await api("/api/marketing/segmentos", { method: "POST", body: JSON.stringify({ nombre: seg.nombre.trim(), reglas: reglasDe(seg) }) }); toast.success("Segmento creado"); setSeg(null); cargar(); } catch (e: any) { toast.error(e.message); }
  };
  const borrarSeg = async (s: Seg) => { if (!confirm(`¿Eliminar el segmento "${s.nombre}"?`)) return; try { await api(`/api/marketing/segmentos/${s.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };

  const sinBuzon = buzones.length === 0;
  const editable = !ed?.id || camps?.find((c) => c.id === ed.id)?.estado === "borrador";

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <ModuleHero icon="megaphone" kicker="Marketing · difusión" title="Campañas" accent="de correo" subtitle="Segmenta tu base, escribe una vez y mide quién abre y quién hace clic. Cada apertura y clic suma puntos de scoring.">
          <StatTile label="Enviados" value={camps ? kpi.env : null} icon="e_mail" />
          <StatTile label="Aperturas" value={camps ? kpi.aperturas : null} suffix="%" icon="eyes" tone="accent" delay={0.06} />
          <StatTile label="Clics" value={camps ? kpi.clics : null} suffix="%" icon="bullseye" tone="good" delay={0.12} />
          <button onClick={() => setEd({ ...VACIA, buzon_id: buzones[0]?.id || "" })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nueva campaña</button>
        </ModuleHero>

        <div className="flex gap-2 mb-5">
          {(["campanas", "segmentos"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("h-11 px-5 rounded-2xl font-bold text-sm border transition", tab === t ? "border-brand-primary/40 bg-brand-primary/10 text-brand-primary" : "border-line bg-white/[0.03] text-ink-sub hover:text-ink")}>{t === "campanas" ? `Campañas${camps ? ` (${camps.length})` : ""}` : `Segmentos${segs ? ` (${segs.length})` : ""}`}</button>
          ))}
        </div>

        {tab === "campanas" && (camps === null ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <div key={i} className="glass-3d rounded-[24px] h-64 skeleton" />)}</div>
        ) : camps.length === 0 ? (
          <div className="glass-3d rounded-[28px]"><EmptyState icon="megaphone" title="Lanza tu primera campaña" text={sinBuzon ? "Antes conecta un buzón de correo en la sección Correo: desde ahí se envían las campañas." : "Elige un segmento, escribe el mensaje y envía. Te mostramos aperturas y clics en tiempo real."} action={<button onClick={() => setEd({ ...VACIA, buzon_id: buzones[0]?.id || "" })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nueva campaña</button>} /></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {camps.map((c, i) => {
              const pct = c.total ? Math.round(((c.enviados + c.fallidos) / c.total) * 100) : 0;
              return (
                <motion.article key={c.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.7, ease: EASE }} className="glass-3d rounded-[24px] p-6 flex flex-col group hover:-translate-y-1.5 transition-transform duration-500">
                  <div className="flex items-start justify-between"><Icon3D name={c.estado === "enviada" ? "party_popper" : "e_mail"} size={46} /><Pill tone={tonoEstado(c.estado)}>{c.estado}</Pill></div>
                  <h3 className="mt-4 font-display font-extrabold text-[26px] leading-tight text-ink">{c.nombre}</h3>
                  <div className="text-xs text-ink-muted mt-1 truncate">{c.asunto || "Sin asunto"} · {c.segmento_nombre || "Todos los contactos"}</div>
                  {c.total > 0 ? (
                    <>
                      <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: EASE }} className="h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-primary to-orange-300" /></div>
                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        {[["Enviados", c.enviados], ["Abiertos", c.abiertos], ["Clics", c.clics], ["Bajas", c.bajas]].map(([l, v]) => (
                          <div key={String(l)} className="rounded-xl bg-white/[0.04] border border-line py-2"><div className="font-display font-extrabold text-[22px] leading-none text-ink tabular-nums">{v}</div><div className="mt-1 text-[9.5px] uppercase tracking-[1.6px] text-ink-muted font-semibold">{l}</div></div>
                        ))}
                      </div>
                    </>
                  ) : <p className="mt-4 text-sm text-ink-sub">Borrador sin enviar.</p>}
                  <div className="mt-5 pt-4 border-t border-line flex items-center gap-2">
                    {c.estado === "borrador" && <button onClick={() => setEd({ id: c.id, nombre: c.nombre, segmento_id: c.segmento_id || "", asunto: c.asunto || "", contenido: c.contenido, buzon_id: c.buzon_id || "" })} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Editar</button>}
                    {c.estado !== "borrador" && <button onClick={() => ver(c)} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Destinatarios</button>}
                    {c.estado === "enviando" && <button onClick={() => pausar(c)} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Pausar</button>}
                    {c.estado === "pausada" && <button onClick={() => reanudar(c)} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Reanudar</button>}
                    {c.estado === "borrador" && <button onClick={() => borrar(c)} aria-label="Eliminar" className="ml-auto h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash className="h-4 w-4" /></button>}
                  </div>
                </motion.article>
              );
            })}
          </div>
        ))}

        {tab === "segmentos" && (
          <Panel kicker="Audiencias" title="Segmentos" icon="compass" right={<button onClick={() => setSeg({ nombre: "", etiqueta: "", fuente: "", tipo_cliente: "", score_min: "" })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nuevo segmento</button>}>
            {segs === null ? <div className="h-40 skeleton rounded-2xl" /> : segs.length === 0 ? (
              <EmptyState icon="compass" title="Sin segmentos" text="Un segmento es un filtro guardado de tus contactos (por etiqueta, fuente, tipo o temperatura)." />
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {segs.map((s) => (
                  <div key={s.id} className="group rounded-2xl border border-line bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between"><div className="font-display font-extrabold text-2xl text-ink">{s.nombre}</div><button onClick={() => borrarSeg(s)} aria-label="Eliminar" className="h-8 w-8 rounded-lg hover:bg-brand-red/10 text-brand-red flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash className="h-3.5 w-3.5" /></button></div>
                    <div className="mt-1 flex flex-wrap gap-1.5">{Object.entries(s.reglas || {}).map(([k, v]) => <Pill key={k} tone="accent">{k}: {String(v)}</Pill>)}{Object.keys(s.reglas || {}).length === 0 && <Pill>todos con correo</Pill>}</div>
                    <div className="mt-4 font-display font-extrabold text-[38px] leading-none text-ink tabular-nums">{s.total}<span className="text-sm text-ink-muted font-sans font-medium ml-2">contactos</span></div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* Editor de campaña */}
      <Modal open={!!ed} onClose={() => setEd(null)} title={ed?.id ? "Editar campaña" : "Nueva campaña"} icon="megaphone" width="max-w-5xl">
        {ed && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div><label className={labelCls}>Nombre interno</label><input className={inputCls} value={ed.nombre} disabled={!editable} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} placeholder="Lanzamiento de verano" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Audiencia</label><select className={inputCls} value={ed.segmento_id} disabled={!editable} onChange={(e) => setEd({ ...ed, segmento_id: e.target.value })}><option value="">Todos los contactos con correo</option>{(segs || []).map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.total})</option>)}</select></div>
                <div><label className={labelCls}>Enviar desde</label><select className={inputCls} value={ed.buzon_id} disabled={!editable} onChange={(e) => setEd({ ...ed, buzon_id: e.target.value })}><option value="">Elige un buzón…</option>{buzones.map((b) => <option key={b.id} value={b.id} disabled={b.auth_type !== "password"}>{b.display_name || b.email}{b.auth_type !== "password" ? " (Gmail no soportado)" : ""}</option>)}</select></div>
              </div>
              {sinBuzon && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">No tienes buzones activos. Conecta uno en <b>Correo</b> para poder enviar.</div>}
              <div><label className={labelCls}>Asunto</label><input className={inputCls} value={ed.asunto} disabled={!editable} onChange={(e) => setEd({ ...ed, asunto: e.target.value })} placeholder="{{nombre}}, esto te va a interesar" /></div>
              <div>
                <div className="flex items-center justify-between"><label className={labelCls}>Contenido (HTML)</label><span className="text-[11px] text-ink-muted">Variables: {"{{nombre}} {{empresa}} {{email}}"}</span></div>
                <textarea className={areaCls + " font-mono text-xs"} rows={13} value={ed.contenido} disabled={!editable} onChange={(e) => setEd({ ...ed, contenido: e.target.value })} />
                <p className="mt-1.5 text-[11px] text-ink-muted">El pie con «Darme de baja» y el seguimiento de aperturas/clics se añaden solos.</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className={labelCls}>Vista previa</div>
              <div className="flex-1 min-h-[380px] rounded-2xl bg-white overflow-hidden border border-line">
                <iframe title="Vista previa" sandbox="" className="w-full h-full min-h-[380px]" srcDoc={ed.contenido.replace(/\{\{\s*nombre\s*\}\}/gi, "Laura").replace(/\{\{\s*empresa\s*\}\}/gi, "Studio L").replace(/\{\{\s*email\s*\}\}/gi, "laura@studio.com")} />
              </div>
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <button onClick={() => setEd(null)} className={btnGhost}>Cerrar</button>
                {editable && (
                  <div className="ml-auto flex gap-3 flex-wrap">
                    <button onClick={guardar} disabled={saving} className={btnGhost}>Guardar borrador</button>
                    <button onClick={prueba} disabled={saving || !ed.buzon_id} className={btnGhost}>Enviarme una prueba</button>
                    <button onClick={enviar} disabled={saving || !ed.buzon_id || !ed.asunto.trim() && !ed.nombre.trim()} className={btnAurora}>Enviar campaña</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Nuevo segmento */}
      <Modal open={!!seg} onClose={() => setSeg(null)} title="Nuevo segmento" icon="compass">
        {seg && (
          <div className="space-y-4">
            <div><label className={labelCls}>Nombre</label><input className={inputCls} value={seg.nombre} onChange={(e) => setSeg({ ...seg, nombre: e.target.value })} placeholder="Leads calientes de Facebook" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Etiqueta</label><input className={inputCls} value={seg.etiqueta} onChange={(e) => setSeg({ ...seg, etiqueta: e.target.value })} placeholder="lead-web" /></div>
              <div><label className={labelCls}>Fuente</label><input className={inputCls} value={seg.fuente} onChange={(e) => setSeg({ ...seg, fuente: e.target.value })} placeholder="formulario" /></div>
              <div><label className={labelCls}>Tipo de cliente</label><select className={inputCls} value={seg.tipo_cliente} onChange={(e) => setSeg({ ...seg, tipo_cliente: e.target.value })}><option value="">Cualquiera</option><option value="lead">Lead</option><option value="cliente">Cliente</option></select></div>
              <div><label className={labelCls}>Puntos mínimos</label><input type="number" min={0} className={inputCls} value={seg.score_min} onChange={(e) => setSeg({ ...seg, score_min: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="rounded-2xl border border-brand-primary/25 bg-brand-primary/[0.07] p-4">
              <div className="text-[10.5px] uppercase tracking-[2px] text-brand-primary font-semibold">Coinciden ahora</div>
              <div className="font-display font-extrabold text-[44px] leading-none text-ink tabular-nums">{preview ? preview.total : "…"}</div>
              {preview?.muestra?.length ? <ul className="mt-2 text-xs text-ink-sub space-y-0.5">{preview.muestra.map((m, i) => <li key={i}>{m.nombre_completo} · {m.email}</li>)}</ul> : null}
            </div>
            <div className="flex justify-end gap-3 pt-1"><button onClick={() => setSeg(null)} className={btnGhost}>Cancelar</button><button onClick={guardarSeg} className={btnAurora}>Guardar segmento</button></div>
          </div>
        )}
      </Modal>

      {/* Destinatarios */}
      <Modal open={!!det} onClose={() => setDet(null)} title={det ? `Destinatarios · ${det.campana.nombre}` : ""} icon="e_mail" width="max-w-4xl">
        {det && (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-[2px] text-ink-muted bg-white/[0.03]"><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Abierto</th><th className="px-4 py-3">Clic</th></tr></thead>
              <tbody className="divide-y divide-line">
                {det.destinatarios.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5"><div className="font-bold text-ink">{r.nombre_completo}</div><div className="text-xs text-ink-muted">{r.destino}</div></td>
                    <td className="px-4 py-2.5"><Pill tone={r.estado === "enviado" ? "good" : r.estado === "fallido" ? "bad" : r.estado === "baja" ? "warn" : "neutral"}>{r.estado}</Pill>{r.error && <div className="text-[11px] text-brand-red mt-1 max-w-[260px] truncate" title={r.error}>{r.error}</div>}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-sub">{r.abierto_at ? new Date(r.abierto_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-sub">{r.clic_at ? new Date(r.clic_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
