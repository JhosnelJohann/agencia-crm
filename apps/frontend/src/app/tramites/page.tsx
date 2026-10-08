"use client";
import { WireShape } from "@/components/motion/WireShape";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, Pencil, X } from "@/lib/bootstrap-icons";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { NumberTicker } from "@/components/magic/NumberTicker";

/**
 * Catálogo de SERVICIOS de la agencia (branding, campañas de Meta Ads, SEO, contenido, etc.).
 * Usa la misma API y tabla que el antiguo catálogo de trámites (`/api/tramites`, `tramites_config`):
 * el color de cada servicio es único y tiñe el pipeline; el "SLA" pasa a ser el plazo de entrega.
 */
interface Servicio {
  id: string;
  nombre: string;
  codigo: string;
  formulario_uscis: string | null; // heredado; ya no se muestra ni se edita
  descripcion?: string | null;
  valor_base: string;
  sla_dias: number;
  puntaje_preparador: string;
  puntaje_vendedor: string;
  puntaje_manager_ventas: string;
  puntaje_manager_preparacion: string;
  puntaje_manager_general: string;
  color: string | null;
  es_tramite_administrativo?: boolean;
  activo?: boolean;
}

const DEFAULT_FORM = {
  id: "",
  nombre: "",
  codigo: "",
  descripcion: "",
  valor_base: "0",
  sla_dias: "30",
  color: "#e8581a",
  puntaje_vendedor: "0",
  puntaje_preparador: "0",
  puntaje_manager_general: "0",
  es_tramite_administrativo: false,
};

const ICONOS: AppIconName[] = ["megaphone", "rocket", "artist_palette", "chart_increasing", "movie_camera", "light_bulb", "globe_showing_americas", "camera", "magic_wand", "gem_stone"];
const EASE = [0.16, 1, 0.3, 1] as const;

const inputCls = "w-full h-11 px-3.5 rounded-xl bg-black/25 border border-line text-sm text-ink outline-none transition focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20";
const labelCls = "text-[10.5px] font-bold uppercase tracking-[2px] text-ink-sub block mb-1.5";

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[] | null>(null);
  const [modal, setModal] = useState<typeof DEFAULT_FORM | null>(null);
  const [paleta, setPaleta] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [colorWarn, setColorWarn] = useState<string | null>(null);
  const [avanzado, setAvanzado] = useState(false);
  const [me, setMe] = useState<any>(null);

  const load = async () => {
    const r = await fetch("/api/tramites");
    const d = await r.json();
    setServicios(d.tramites || []);
  };

  useEffect(() => {
    load();
    fetch("/api/tramites/color-disponible").then((r) => r.json()).then((d) => setPaleta(d.paleta || []));
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user)).catch(() => {});
  }, []);

  const openNew = async () => {
    const r = await fetch("/api/tramites/color-disponible");
    const d = await r.json();
    setModal({ ...DEFAULT_FORM, color: d.sugerido || "#e8581a" });
    setColorWarn(null);
    setAvanzado(false);
  };

  const openEdit = (t: Servicio) => {
    setModal({
      id: t.id,
      nombre: t.nombre,
      codigo: t.codigo,
      descripcion: t.descripcion || "",
      valor_base: String(t.valor_base),
      sla_dias: String(t.sla_dias),
      color: t.color || "#94a3b8",
      puntaje_vendedor: String(t.puntaje_vendedor ?? 0),
      puntaje_preparador: String(t.puntaje_preparador ?? 0),
      puntaje_manager_general: String((t as any).puntaje_manager_general ?? 0),
      es_tramite_administrativo: !!t.es_tramite_administrativo,
    });
    setColorWarn(null);
    setAvanzado(false);
  };

  const checkColor = async (hex: string) => {
    if (!hex || !modal) return;
    const r = await fetch(`/api/tramites/color-disponible?color=${encodeURIComponent(hex)}`);
    const d = await r.json();
    setColorWarn(d.disponible === false ? `Color usado por "${d.tomado_por?.nombre}". Sugerido: ${d.sugerido}` : null);
  };

  const save = async () => {
    if (!modal) return;
    if (!modal.nombre || !modal.codigo) { toast.error("Nombre y código requeridos"); return; }
    setSaving(true);
    try {
      const body = {
        nombre: modal.nombre,
        codigo: modal.codigo,
        formulario_uscis: null,
        descripcion: modal.descripcion || null,
        valor_base: Number(modal.valor_base) || 0,
        sla_dias: Number(modal.sla_dias) || 30,
        color: modal.color,
        es_tramite_administrativo: modal.es_tramite_administrativo,
        puntaje_vendedor: Number(modal.puntaje_vendedor) || 0,
        puntaje_preparador: Number(modal.puntaje_preparador) || 0,
        puntaje_manager_ventas: Number(modal.puntaje_manager_general) || 0,
        puntaje_manager_preparacion: Number(modal.puntaje_manager_general) || 0,
        puntaje_manager_general: Number(modal.puntaje_manager_general) || 0,
      };
      const r = modal.id
        ? await fetch(`/api/tramites/${modal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/tramites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const e = await r.json();
        if (e.tomado_por) {
          toast.error(`Color en uso por "${e.tomado_por.nombre}". Usa el sugerido ${e.sugerido}.`);
          setModal({ ...modal, color: e.sugerido });
        } else {
          toast.error(typeof e.error === "string" ? e.error : "Error al guardar");
        }
        return;
      }
      toast.success(modal.id ? "Servicio actualizado" : "Servicio creado");
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const remove = async (t: Servicio) => {
    if (!confirm(`¿Desactivar el servicio "${t.nombre}"?`)) return;
    const r = await fetch(`/api/tramites/${t.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Servicio desactivado"); load(); }
    else toast.error("Error");
  };

  const isAdmin = me?.nivel_acceso === "super_admin" || me?.nivel_acceso === "admin";
  const activos = (servicios || []).filter((s) => s.activo !== false);
  const ticket = activos.length ? activos.reduce((a, s) => a + Number(s.valor_base || 0), 0) / activos.length : 0;

  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        {/* Héroe */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}
          className="glass-3d rounded-[28px] relative overflow-hidden p-7 sm:p-9 mb-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(232,88,26,0.26), transparent 72%)" }} />
          <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden />
          <WireShape kind="torus" size={300} className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-60 hidden md:block" />
          <div className="relative flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              <AppIcon name="toolbox" size={64} />
              <div>
                <div className="kicker">Comercial · catálogo</div>
                <h1 className="mt-1.5 text-[clamp(28px,3.4vw,44px)] leading-none text-ink">Servicios <span className="text-brand-orange text-orange-glow">de la agencia</span></h1>
                <p className="mt-2 text-ink-sub max-w-xl">Lo que vendes, con su precio base, plazo de entrega y un color único que tiñe todo tu pipeline.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-white/[0.04] border border-line px-5 py-3 text-center">
                <div className="font-display font-extrabold text-4xl leading-none text-ink tabular-nums"><NumberTicker value={servicios ? activos.length : null} /></div>
                <div className="mt-1 text-[10px] uppercase tracking-[2px] text-ink-muted font-semibold">servicios</div>
              </div>
              <div className="rounded-2xl bg-brand-primary/10 border border-brand-primary/25 px-5 py-3 text-center">
                <div className="font-display font-extrabold text-4xl leading-none text-ink tabular-nums">$<NumberTicker value={servicios ? Math.round(ticket) : null} /></div>
                <div className="mt-1 text-[10px] uppercase tracking-[2px] text-brand-primary font-semibold">ticket medio</div>
              </div>
              {isAdmin && (
                <button onClick={openNew} className="btn-aurora h-12 px-5 rounded-2xl text-white font-bold text-[15px] inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" weight="bold" /> Nuevo servicio
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {servicios === null
            ? Array.from({ length: 6 }).map((_, i) => (<div key={i} className="glass-3d rounded-[24px] h-52 skeleton" />))
            : servicios.length === 0
              ? (
                <div className="col-span-full glass-3d rounded-[28px] p-14 text-center">
                  <AppIcon name="crystal_ball" size={84} />
                  <div className="mt-4 font-display font-bold text-3xl uppercase text-ink">Aún no tienes servicios</div>
                  <p className="text-ink-sub mt-1">Crea el primero (por ejemplo "Gestión de Meta Ads") y úsalo en tus oportunidades.</p>
                </div>
              )
              : servicios.map((t, i) => {
                const color = t.color || "#94a3b8";
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.7, ease: EASE }}
                    className="glass-3d rounded-[24px] overflow-hidden group hover:-translate-y-1.5 transition-transform duration-500"
                    style={{ boxShadow: `var(--glass-shadow), 0 30px 60px -40px ${color}` }}
                  >
                    <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}44` }}>
                          <AppIcon name={ICONOS[i % ICONOS.length]} size={38} />
                        </div>
                        <span className="text-[10.5px] font-bold uppercase tracking-[2px] px-2.5 py-1 rounded-lg text-white" style={{ background: color }}>{t.codigo}</span>
                      </div>
                      <h3 className="font-display font-extrabold text-[26px] leading-tight text-ink">{t.nombre}</h3>
                      {t.descripcion && <p className="mt-1 text-sm text-ink-sub line-clamp-2">{t.descripcion}</p>}
                      <div className="mt-5 pt-4 border-t border-line flex items-center gap-5">
                        <div>
                          <div className="text-[10px] uppercase tracking-[2px] text-ink-muted font-semibold">Precio base</div>
                          <div className="font-display font-extrabold text-3xl tabular-nums text-ink">${Number(t.valor_base).toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[2px] text-ink-muted font-semibold">Entrega</div>
                          <div className="font-display font-extrabold text-3xl tabular-nums text-ink">{t.sla_dias}<span className="text-base text-ink-sub ml-1">días</span></div>
                        </div>
                        {isAdmin && (
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                            <button onClick={() => openEdit(t)} aria-label="Editar" className="h-9 w-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center"><Pencil className="h-4 w-4 text-ink-sub" /></button>
                            <button onClick={() => remove(t)} aria-label="Desactivar" className="h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center"><Trash className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={(e) => e.stopPropagation()}
              className="glass-3d glass-blur rounded-[28px] p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin" data-lenis-prevent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <AppIcon name="toolbox" size={40} />
                  <h2 className="text-[30px] text-ink">{modal.id ? "Editar servicio" : "Nuevo servicio"}</h2>
                </div>
                <button onClick={() => setModal(null)} aria-label="Cerrar" className="h-10 w-10 rounded-xl hover:bg-white/[0.08] flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  <div>
                    <label className={labelCls}>Código</label>
                    <input value={modal.codigo} onChange={(e) => setModal({ ...modal, codigo: e.target.value.toUpperCase() })} placeholder="ADS" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Nombre</label>
                    <input value={modal.nombre} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} placeholder="Gestión de Meta Ads" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Descripción</label>
                  <input value={modal.descripcion} onChange={(e) => setModal({ ...modal, descripcion: e.target.value })} placeholder="Qué incluye este servicio" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Precio base (USD)</label>
                    <input type="number" value={modal.valor_base} onChange={(e) => setModal({ ...modal, valor_base: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Plazo de entrega (días)</label>
                    <input type="number" value={modal.sla_dias} onChange={(e) => setModal({ ...modal, sla_dias: e.target.value })} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Color del servicio</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="color" value={modal.color} onChange={(e) => { const c = e.target.value.toUpperCase(); setModal({ ...modal, color: c }); checkColor(c); }} className="h-11 w-14 rounded-xl border border-line bg-transparent cursor-pointer" />
                    <input value={modal.color} onChange={(e) => { const c = e.target.value.toUpperCase(); setModal({ ...modal, color: c }); checkColor(c); }} className={inputCls + " font-mono"} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {paleta.map((c) => (
                      <button key={c} type="button" onClick={() => { setModal({ ...modal, color: c }); checkColor(c); }}
                        className={`h-8 w-8 rounded-lg border-2 transition ${modal.color.toUpperCase() === c.toUpperCase() ? "border-white scale-110 shadow-glow" : "border-transparent"}`}
                        style={{ background: c }} title={c} />
                    ))}
                  </div>
                  {colorWarn && <div className="mt-2 text-[11px] text-brand-red">{colorWarn}</div>}
                </div>

                <button type="button" onClick={() => setAvanzado((v) => !v)} className="text-xs font-bold uppercase tracking-[2px] text-brand-primary hover:brightness-125 transition">
                  {avanzado ? "− Ocultar" : "+ Mostrar"} opciones avanzadas
                </button>
                <AnimatePresence initial={false}>
                  {avanzado && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                      <label className="flex items-center gap-2.5 text-sm text-ink-sub">
                        <input type="checkbox" className="accent-[#e8581a] h-4 w-4" checked={modal.es_tramite_administrativo} onChange={(e) => setModal({ ...modal, es_tramite_administrativo: e.target.checked })} />
                        Servicio interno / administrativo
                      </label>
                      <div>
                        <label className={labelCls}>Puntos por cargo al completarlo</label>
                        <div className="grid grid-cols-3 gap-3">
                          {([["Ventas", "puntaje_vendedor"], ["Ejecución", "puntaje_preparador"], ["Manager", "puntaje_manager_general"]] as const).map(([l, k]) => (
                            <div key={k}>
                              <div className="text-[10px] uppercase tracking-[1.6px] text-ink-muted mb-1">{l}</div>
                              <input type="number" step="0.01" value={(modal as any)[k]} onChange={(e) => setModal({ ...modal, [k]: e.target.value } as any)} className={inputCls} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-3 mt-7">
                <button onClick={() => setModal(null)} className="flex-1 h-12 rounded-2xl border border-line text-sm font-bold text-ink-sub hover:bg-white/[0.06] transition">Cancelar</button>
                <button onClick={save} disabled={saving} className="btn-aurora flex-1 h-12 rounded-2xl text-white text-sm font-bold disabled:opacity-50">{saving ? "Guardando…" : "Guardar servicio"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
