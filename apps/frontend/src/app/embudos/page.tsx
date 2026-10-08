"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash, Pencil, ArrowUp, ArrowDown, X } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { AreaChart, EASE, EmptyState, Modal, Panel, Pill, StatTile, Switch, ModuleHero, api, areaCls, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

/**
 * Embudos y formularios (Módulo 1). Cada formulario tiene su página pública (`/f/<slug>`), captura UTM/fbclid,
 * mide vistas y envíos, crea o actualiza el contacto (sin duplicarlo) y abre una oportunidad en el pipeline.
 */
type Tipo = "text" | "email" | "tel" | "textarea" | "select" | "checkbox" | "url";
interface Campo { key: string; label: string; type: Tipo; required: boolean; placeholder?: string; options?: string[]; }
interface Form {
  id: string; nombre: string; slug: string; descripcion: string | null; titulo_publico: string | null; boton_texto: string;
  campos: Campo[]; mensaje_gracias: string; redirect_url: string | null; estado: "borrador" | "activo" | "pausado";
  crear_oportunidad: boolean; etapa_key: string; etiqueta: string | null; vistas: number; envios: number; envios_7d: number;
}
const TIPOS: { v: Tipo; l: string }[] = [
  { v: "text", l: "Texto" }, { v: "email", l: "Correo" }, { v: "tel", l: "Teléfono / WhatsApp" }, { v: "textarea", l: "Texto largo" },
  { v: "select", l: "Lista desplegable" }, { v: "checkbox", l: "Casilla" }, { v: "url", l: "Sitio web" },
];
const PLANTILLA: Campo[] = [
  { key: "nombre", label: "Nombre", type: "text", required: true },
  { key: "email", label: "Correo electrónico", type: "email", required: true },
  { key: "telefono", label: "WhatsApp", type: "tel", required: false },
  { key: "empresa", label: "Empresa", type: "text", required: false },
];
const VACIO = {
  id: "", nombre: "", titulo_publico: "", boton_texto: "Quiero mi diagnóstico", mensaje_gracias: "¡Gracias! Te contactaremos muy pronto.", redirect_url: "",
  estado: "borrador" as Form["estado"], crear_oportunidad: true, etapa_key: "nuevo", etiqueta: "", campos: PLANTILLA as Campo[],
};
const slugKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36) || "campo";

export default function EmbudosPage() {
  const [forms, setForms] = useState<Form[] | null>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [stages, setStages] = useState<{ key: string; label: string }[]>([]);
  const [editor, setEditor] = useState<typeof VACIO | null>(null);
  const [saving, setSaving] = useState(false);
  const [embed, setEmbed] = useState<Form | null>(null);
  const [envios, setEnvios] = useState<{ form: Form; rows: any[]; total: number } | null>(null);
  const origen = typeof window !== "undefined" ? window.location.origin : "";

  const cargar = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([api("/api/marketing/forms"), api("/api/marketing/resumen")]);
      setForms(f.formularios); setResumen(r);
    } catch (e: any) { toast.error(e.message); setForms([]); }
  }, []);
  useEffect(() => {
    cargar();
    api("/api/pipeline/stages").then((d) => setStages(d.stages || [])).catch(() => {});
  }, [cargar]);

  const conv = (f: { vistas: number; envios: number }) => (f.vistas > 0 ? Math.round((f.envios / f.vistas) * 1000) / 10 : 0);
  const k = resumen?.kpis;
  const convGlobal = k && k.vistas_30d > 0 ? Math.round((k.envios_30d / k.vistas_30d) * 1000) / 10 : 0;

  const guardar = async () => {
    if (!editor) return;
    if (editor.nombre.trim().length < 2) { toast.error("Ponle un nombre al formulario"); return; }
    if (editor.campos.some((c) => !c.label.trim())) { toast.error("Todos los campos necesitan una etiqueta"); return; }
    if (editor.campos.some((c) => c.type === "select" && !(c.options || []).length)) { toast.error("Las listas desplegables necesitan al menos una opción"); return; }
    setSaving(true);
    try {
      const body: any = {
        nombre: editor.nombre.trim(), titulo_publico: editor.titulo_publico || null, boton_texto: editor.boton_texto || "Enviar",
        mensaje_gracias: editor.mensaje_gracias, redirect_url: editor.redirect_url || null, estado: editor.estado,
        crear_oportunidad: editor.crear_oportunidad, etapa_key: editor.etapa_key, etiqueta: editor.etiqueta || null, campos: editor.campos,
      };
      if (editor.id) await api(`/api/marketing/forms/${editor.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/marketing/forms", { method: "POST", body: JSON.stringify(body) });
      toast.success(editor.id ? "Formulario actualizado" : "Formulario creado");
      setEditor(null); cargar();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const abrirEditor = (f: Form) => setEditor({
    id: f.id, nombre: f.nombre, titulo_publico: f.titulo_publico || "", boton_texto: f.boton_texto, mensaje_gracias: f.mensaje_gracias, redirect_url: f.redirect_url || "",
    estado: f.estado, crear_oportunidad: f.crear_oportunidad, etapa_key: f.etapa_key, etiqueta: f.etiqueta || "", campos: f.campos,
  });
  const cambiarEstado = async (f: Form, estado: Form["estado"]) => {
    try { await api(`/api/marketing/forms/${f.id}`, { method: "PATCH", body: JSON.stringify({ estado }) }); cargar(); toast.success(estado === "activo" ? "Formulario publicado" : "Formulario pausado"); }
    catch (e: any) { toast.error(e.message); }
  };
  const duplicar = async (f: Form) => { try { await api(`/api/marketing/forms/${f.id}/duplicar`, { method: "POST" }); toast.success("Copia creada en borrador"); cargar(); } catch (e: any) { toast.error(e.message); } };
  const archivar = async (f: Form) => {
    if (!confirm(`¿Archivar "${f.nombre}"? Deja de estar disponible; los envíos y contactos se conservan.`)) return;
    try { await api(`/api/marketing/forms/${f.id}`, { method: "DELETE" }); toast.success("Formulario archivado"); cargar(); } catch (e: any) { toast.error(e.message); }
  };
  const verEnvios = async (f: Form) => { try { const d = await api(`/api/marketing/forms/${f.id}/envios?pageSize=50`); setEnvios({ form: f, rows: d.envios, total: d.total }); } catch (e: any) { toast.error(e.message); } };
  const copiar = (t: string, ok = "Copiado") => { navigator.clipboard?.writeText(t).then(() => toast.success(ok)).catch(() => toast.error("No se pudo copiar")); };

  const setCampo = (i: number, p: Partial<Campo>) => setEditor((e) => e && ({ ...e, campos: e.campos.map((c, j) => (j === i ? { ...c, ...p } : c)) }));
  const mover = (i: number, d: -1 | 1) => setEditor((e) => {
    if (!e) return e; const j = i + d; if (j < 0 || j >= e.campos.length) return e;
    const c = [...e.campos]; [c[i], c[j]] = [c[j], c[i]]; return { ...e, campos: c };
  });
  const agregarCampo = () => setEditor((e) => {
    if (!e) return e; let n = e.campos.length + 1; let key = `campo_${n}`; while (e.campos.some((c) => c.key === key)) key = `campo_${++n}`;
    return { ...e, campos: [...e.campos, { key, label: "", type: "text", required: false }] };
  });

  const serie = useMemo(() => resumen?.serie || [], [resumen]);
  const embedCode = embed ? `<iframe src="${origen}/f/${embed.slug}?embed=1" width="100%" height="640" style="border:0;border-radius:16px" loading="lazy" title="${embed.nombre}"></iframe>` : "";

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <ModuleHero shape="torus" icon="satellite_antenna" kicker="Marketing · captación" title="Embudos" accent="y formularios" subtitle="Páginas de captura con seguimiento de UTM: cada envío crea un contacto, abre una oportunidad y suma puntos de scoring.">
          <StatTile label="Vistas · 30 d" value={k ? k.vistas_30d : null} icon="eyes" />
          <StatTile label="Envíos · 30 d" value={k ? k.envios_30d : null} icon="party_popper" tone="accent" delay={0.06} />
          <StatTile label="Conversión" value={k ? convGlobal : null} suffix="%" icon="bullseye" tone="good" delay={0.12} />
          <button onClick={() => setEditor({ ...VACIO, campos: PLANTILLA.map((c) => ({ ...c })) })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nuevo formulario</button>
        </ModuleHero>

        <div className="grid grid-cols-12 gap-5 mb-6">
          <Panel className="col-span-12 xl:col-span-8" kicker="Rendimiento" title="Vistas y envíos" icon="chart_increasing" delay={0.05}>
            {serie.length ? <AreaChart data={serie} a="envios" b="vistas" labelA="Envíos" labelB="Vistas" /> : <div className="h-[190px] skeleton rounded-2xl" />}
          </Panel>
          <Panel className="col-span-12 xl:col-span-4" kicker="Origen" title="Fuentes" icon="globe_showing_americas" delay={0.1}>
            {resumen?.fuentes?.length ? (
              <ul className="space-y-3">
                {resumen.fuentes.map((f: any, i: number) => {
                  const max = Math.max(...resumen.fuentes.map((x: any) => x.envios)) || 1;
                  return (
                    <li key={f.fuente}>
                      <div className="flex justify-between text-sm"><span className="text-ink font-semibold capitalize">{f.fuente}</span><span className="tabular-nums text-ink-sub">{f.envios}</span></div>
                      <div className="mt-1.5 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(f.envios / max) * 100}%` }} transition={{ duration: 1.1, ease: EASE, delay: 0.2 + i * 0.07 }} className="h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-primary to-orange-300" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-ink-muted py-6">Aún no hay envíos con origen. Comparte un enlace con <code className="text-brand-primary">?utm_source=…</code> y aparecerá aquí.</p>}
          </Panel>
        </div>

        {/* Formularios */}
        {forms === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <div key={i} className="glass-3d rounded-[24px] h-64 skeleton" />)}</div>
        ) : forms.length === 0 ? (
          <div className="glass-3d rounded-[28px]"><EmptyState icon="satellite_antenna" title="Crea tu primer embudo" text="Un formulario público con tu marca, listo para compartir o incrustar en tu web y anuncios." action={<button onClick={() => setEditor({ ...VACIO, campos: PLANTILLA.map((c) => ({ ...c })) })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nuevo formulario</button>} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {forms.map((f, i) => (
              <motion.article key={f.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.7, ease: EASE }}
                className="glass-3d rounded-[24px] p-6 flex flex-col group hover:-translate-y-1.5 transition-transform duration-500">
                <div className="flex items-start justify-between gap-3">
                  <AppIcon name="clipboard" size={46} />
                  <div className="flex items-center gap-2">
                    <Pill tone={f.estado === "activo" ? "good" : f.estado === "pausado" ? "warn" : "neutral"}>{f.estado}</Pill>
                    <Switch checked={f.estado === "activo"} onChange={(v) => cambiarEstado(f, v ? "activo" : "pausado")} label="Publicar formulario" />
                  </div>
                </div>
                <h3 className="mt-4 font-display font-extrabold text-[28px] leading-tight text-ink">{f.nombre}</h3>
                <button onClick={() => copiar(`${origen}/f/${f.slug}`, "Enlace copiado")} className="mt-1 text-left text-xs text-ink-muted hover:text-brand-primary transition truncate">/f/{f.slug} · copiar enlace</button>
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[["Vistas", f.vistas], ["Envíos", f.envios], ["Conversión", `${conv(f)}%`]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-xl bg-white/[0.04] border border-line py-2.5">
                      <div className="font-display font-extrabold text-[26px] leading-none text-ink tabular-nums">{v}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[1.8px] text-ink-muted font-semibold">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-line flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => verEnvios(f)} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Envíos ({f.envios})</button>
                  <button onClick={() => setEmbed(f)} className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Incrustar</button>
                  <a href={`/f/${f.slug}`} target="_blank" rel="noreferrer" className={cn(btnGhost, "!h-9 !px-3 !rounded-xl !text-xs")}>Abrir ↗</a>
                  <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                    <button onClick={() => abrirEditor(f)} aria-label="Editar" className="h-9 w-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center"><Pencil className="h-4 w-4 text-ink-sub" /></button>
                    <button onClick={() => duplicar(f)} aria-label="Duplicar" className="h-9 w-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center text-ink-sub text-sm">⧉</button>
                    <button onClick={() => archivar(f)} aria-label="Archivar" className="h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center"><Trash className="h-4 w-4" /></button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "Editar formulario" : "Nuevo formulario"} icon="clipboard" width="max-w-3xl">
        {editor && (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Nombre interno</label><input className={inputCls} value={editor.nombre} onChange={(e) => setEditor({ ...editor, nombre: e.target.value })} placeholder="Diagnóstico gratuito" /></div>
              <div><label className={labelCls}>Título público</label><input className={inputCls} value={editor.titulo_publico} onChange={(e) => setEditor({ ...editor, titulo_publico: e.target.value })} placeholder="Recibe tu diagnóstico" /></div>
              <div><label className={labelCls}>Texto del botón</label><input className={inputCls} value={editor.boton_texto} onChange={(e) => setEditor({ ...editor, boton_texto: e.target.value })} /></div>
              <div><label className={labelCls}>Etiqueta para el contacto</label><input className={inputCls} value={editor.etiqueta} onChange={(e) => setEditor({ ...editor, etiqueta: e.target.value })} placeholder="lead-web" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={labelCls + " !mb-0"}>Campos</div>
                <button onClick={agregarCampo} className="text-xs font-bold uppercase tracking-[2px] text-brand-primary hover:brightness-125">+ Añadir campo</button>
              </div>
              <div className="space-y-2.5">
                {editor.campos.map((c, i) => (
                  <div key={c.key} className="rounded-2xl border border-line bg-white/[0.03] p-3">
                    <div className="grid grid-cols-[1fr_170px_auto] gap-2 items-center">
                      <input className={inputCls + " !h-10"} value={c.label} placeholder="Etiqueta (lo que ve la persona)" onChange={(e) => setCampo(i, { label: e.target.value, ...(/^campo_\d+$/.test(c.key) ? { key: slugKey(e.target.value) } : {}) })} />
                      <select className={inputCls + " !h-10"} value={c.type} onChange={(e) => setCampo(i, { type: e.target.value as Tipo })}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select>
                      <div className="flex items-center gap-1">
                        <button onClick={() => mover(i, -1)} aria-label="Subir" className="h-8 w-8 rounded-lg hover:bg-white/[0.08] flex items-center justify-center"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => mover(i, 1)} aria-label="Bajar" className="h-8 w-8 rounded-lg hover:bg-white/[0.08] flex items-center justify-center"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditor({ ...editor, campos: editor.campos.filter((_, j) => j !== i) })} aria-label="Quitar" disabled={editor.campos.length <= 1} className="h-8 w-8 rounded-lg hover:bg-brand-red/10 text-brand-red flex items-center justify-center disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 flex-wrap text-xs text-ink-sub">
                      <label className="inline-flex items-center gap-2"><Switch checked={c.required} onChange={(v) => setCampo(i, { required: v })} label="Obligatorio" /> Obligatorio</label>
                      <span className="text-ink-muted">clave: <code className="text-brand-primary">{c.key}</code>{["nombre", "email", "telefono", "empresa", "cargo", "sitio_web", "industria"].includes(c.key) && " · se guarda en la ficha del contacto"}</span>
                    </div>
                    {c.type === "select" && (
                      <input className={inputCls + " !h-10 mt-2"} placeholder="Opciones separadas por coma" value={(c.options || []).join(", ")} onChange={(e) => setCampo(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Mensaje de gracias</label><textarea className={areaCls} rows={2} value={editor.mensaje_gracias} onChange={(e) => setEditor({ ...editor, mensaje_gracias: e.target.value })} /></div>
              <div><label className={labelCls}>Redirigir a (opcional)</label><input className={inputCls} value={editor.redirect_url} onChange={(e) => setEditor({ ...editor, redirect_url: e.target.value })} placeholder="https://agenda.sandrogozz.com/…" /></div>
            </div>

            <div className="rounded-2xl border border-line bg-white/[0.03] p-4 flex items-center gap-4 flex-wrap">
              <label className="inline-flex items-center gap-3 text-sm text-ink"><Switch checked={editor.crear_oportunidad} onChange={(v) => setEditor({ ...editor, crear_oportunidad: v })} label="Crear oportunidad" /> Abrir una oportunidad en el pipeline por cada envío</label>
              {editor.crear_oportunidad && (
                <select className={inputCls + " !w-56 ml-auto"} value={editor.etapa_key} onChange={(e) => setEditor({ ...editor, etapa_key: e.target.value })}>
                  {(stages.length ? stages : [{ key: "nuevo", label: "Nuevo lead" }]).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="inline-flex items-center gap-3 text-sm text-ink-sub"><Switch checked={editor.estado === "activo"} onChange={(v) => setEditor({ ...editor, estado: v ? "activo" : "borrador" })} label="Publicar" /> Publicar al guardar</label>
              <div className="ml-auto flex gap-3">
                <button onClick={() => setEditor(null)} className={btnGhost}>Cancelar</button>
                <button onClick={guardar} disabled={saving} className={btnAurora}>{saving ? "Guardando…" : "Guardar formulario"}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Incrustar */}
      <Modal open={!!embed} onClose={() => setEmbed(null)} title="Compartir e incrustar" icon="link" width="max-w-2xl">
        {embed && (
          <div className="space-y-5">
            {embed.estado !== "activo" && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">Este formulario está en <b>{embed.estado}</b>: el enlace no funcionará hasta que lo publiques.</div>}
            <div>
              <label className={labelCls}>Enlace directo (para anuncios y bio)</label>
              <div className="flex gap-2"><input readOnly className={inputCls} value={`${origen}/f/${embed.slug}`} /><button onClick={() => copiar(`${origen}/f/${embed.slug}`, "Enlace copiado")} className={btnGhost}>Copiar</button></div>
              <p className="mt-2 text-xs text-ink-muted">Añade tus parámetros: <code className="text-brand-primary">?utm_source=facebook&amp;utm_medium=cpc&amp;utm_campaign=verano</code> — se guardan con cada lead.</p>
            </div>
            <div>
              <label className={labelCls}>Incrustar en tu sitio web</label>
              <textarea readOnly rows={3} className={areaCls + " font-mono text-xs"} value={embedCode} />
              <div className="mt-2"><button onClick={() => copiar(embedCode, "Código copiado")} className={btnGhost}>Copiar código</button></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Envíos */}
      <Modal open={!!envios} onClose={() => setEnvios(null)} title={envios ? `Envíos · ${envios.form.nombre}` : "Envíos"} icon="party_popper" width="max-w-5xl">
        {envios && (envios.rows.length === 0 ? (
          <EmptyState icon="eyes" title="Sin envíos todavía" text="Cuando alguien llene este formulario aparecerá aquí con su origen." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10.5px] uppercase tracking-[2px] text-ink-muted bg-white/[0.03]">
                <th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Datos</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Fecha</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {envios.rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3"><div className="font-bold text-ink">{r.contacto_nombre || "—"}</div><div className="text-xs text-ink-muted">{r.contacto_email}</div></td>
                    <td className="px-4 py-3 text-xs text-ink-sub max-w-[300px]">{Object.entries(r.payload || {}).filter(([, v]) => v !== "" && v !== false).map(([k, v]) => <div key={k}><span className="text-ink-muted">{k}:</span> {String(v)}</div>)}</td>
                    <td className="px-4 py-3 text-xs">{r.utm_source ? <Pill tone="accent">{r.utm_source}{r.utm_campaign ? ` · ${r.utm_campaign}` : ""}</Pill> : <span className="text-ink-muted">directo</span>}</td>
                    <td className="px-4 py-3 text-xs text-ink-sub whitespace-nowrap">{new Date(r.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Modal>
    </AppShell>
  );
}
