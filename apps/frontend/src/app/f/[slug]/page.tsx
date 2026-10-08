"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BrandMark } from "@/components/magic/BrandMark";
import { AppIcon } from "@/components/ui/AppIcon";

/**
 * Formulario público (Módulo 1). Sin sesión: vive fuera del CRM y también sirve incrustado (`?embed=1`).
 * Captura UTM y fbclid de la URL, mide la visita (vista, scroll 50/90 %, tiempo 30 s, foco en campos)
 * y envía a `/api/public/forms/<slug>/submit`. Campo `website_hp` = cebo oculto contra bots.
 */
interface Campo { key: string; label: string; type: string; required: boolean; placeholder?: string; options?: string[]; }
interface Formulario { id: string; nombre: string; titulo_publico: string | null; descripcion: string | null; boton_texto: string; campos: Campo[]; mensaje_gracias: string; redirect_url: string | null; }

const EASE = [0.16, 1, 0.3, 1] as const;
const inputCls = "w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.12] text-[15px] text-ink placeholder:text-ink-muted outline-none transition focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-primary/20";

function sesion(): string {
  try {
    let s = localStorage.getItem("gozz_sid");
    if (!s) { s = crypto.randomUUID(); localStorage.setItem("gozz_sid", s); }
    return s;
  } catch { return crypto.randomUUID(); }
}

export default function FormularioPublico() {
  const { slug } = useParams<{ slug: string }>();
  const sp = useSearchParams();
  const embed = sp.get("embed") === "1";
  const [form, setForm] = useState<Formulario | null>(null);
  const [estado, setEstado] = useState<"cargando" | "no" | "listo" | "enviado">("cargando");
  const [vals, setVals] = useState<Record<string, any>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [envio, setEnvio] = useState(false);
  const [hp, setHp] = useState("");
  const pv = useRef<string | null>(null);
  const hechos = useRef<Set<string>>(new Set());

  const utm = () => ({
    source: sp.get("utm_source") || "", medium: sp.get("utm_medium") || "", campaign: sp.get("utm_campaign") || "",
    content: sp.get("utm_content") || "", term: sp.get("utm_term") || "",
  });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/public/forms/${slug}`).then(async (r) => {
      if (!vivo) return;
      if (!r.ok) { setEstado("no"); return; }
      const d = await r.json(); setForm(d.formulario); setEstado("listo");
      const rp = await fetch("/api/public/track/pageview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, session_id: sesion(), landing_url: location.href, referrer: document.referrer, utm: utm(), fbclid: sp.get("fbclid") || "" }),
      }).catch(() => null);
      if (rp?.ok) pv.current = (await rp.json()).id;
    }).catch(() => vivo && setEstado("no"));
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const evento = (tipo: string, datos: any = {}) => {
    if (!pv.current || hechos.current.has(tipo)) return;
    hechos.current.add(tipo);
    fetch("/api/public/track/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_view_id: pv.current, tipo, datos }), keepalive: true }).catch(() => {});
  };
  useEffect(() => {
    const t = setTimeout(() => evento("time_30s"), 30_000);
    const onScroll = () => {
      const h = document.documentElement; const p = (h.scrollTop + h.clientHeight) / Math.max(1, h.scrollHeight);
      if (p > 0.5) evento("scroll_50"); if (p > 0.9) evento("scroll_90");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("scroll", onScroll); };
  }, []);

  // En modo incrustado, avisa a la página contenedora de la altura para que no salgan barras dobles.
  useEffect(() => {
    if (!embed) return;
    const send = () => window.parent?.postMessage({ type: "gozz-form-height", height: document.documentElement.scrollHeight }, "*");
    send(); const ro = new ResizeObserver(send); ro.observe(document.body); return () => ro.disconnect();
  }, [embed, estado]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || envio) return;
    setEnvio(true); setMsg(""); setErrs({});
    try {
      const r = await fetch(`/api/public/forms/${slug}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datos: vals, website_hp: hp, utm: utm(), fbclid: sp.get("fbclid") || "", session_id: sesion(), landing_url: location.href, referrer: document.referrer }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErrs(d.errores || {}); setMsg(d.error || "No pudimos enviar tu solicitud."); return; }
      setEstado("enviado"); setMsg(d.mensaje || form.mensaje_gracias);
      if (d.redirect_url) setTimeout(() => { window.location.href = d.redirect_url; }, 1800);
    } catch { setMsg("Sin conexión. Inténtalo de nuevo."); } finally { setEnvio(false); }
  };

  const marco = embed ? "min-h-0 py-4" : "min-h-screen py-10";
  return (
    <main className={`relative ${marco} px-4 flex items-center justify-center text-ink`}>
      <div className="relative z-10 w-full max-w-[460px]">
        {!embed && <div className="mb-6 flex justify-center"><BrandMark size="md" /></div>}
        <AnimatePresence mode="wait">
          {estado === "cargando" && <div key="c" className="glass-3d rounded-[28px] h-72 skeleton" />}
          {estado === "no" && (
            <motion.div key="n" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-3d rounded-[28px] p-10 text-center">
              <AppIcon name="hourglass_done" size={72} />
              <h1 className="mt-4 text-[32px]">Formulario no disponible</h1>
              <p className="mt-2 text-ink-sub">Este enlace no está activo o ya no existe.</p>
            </motion.div>
          )}
          {estado === "enviado" && (
            <motion.div key="e" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: EASE, duration: 0.6 }} className="glass-3d rounded-[28px] p-10 text-center">
              <AppIcon name="party_popper" size={96} />
              <h1 className="mt-4 text-[38px]">¡Recibido!</h1>
              <p className="mt-2 text-ink-sub">{msg}</p>
            </motion.div>
          )}
          {estado === "listo" && form && (
            <motion.form key="f" onSubmit={enviar} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.8 }} className="glass-3d glass-blur rounded-[28px] p-7 sm:p-9" noValidate>
              <div className="kicker">{form.nombre}</div>
              <h1 className="mt-3 text-[clamp(30px,6vw,40px)] leading-[1.02]">{form.titulo_publico || form.nombre}</h1>
              {form.descripcion && <p className="mt-2 text-ink-sub text-sm">{form.descripcion}</p>}
              <div className="mt-6 space-y-4">
                {form.campos.map((c) => (
                  <div key={c.key}>
                    {c.type !== "checkbox" && <label htmlFor={c.key} className="text-[11px] font-bold uppercase tracking-[2px] text-ink-sub block mb-1.5">{c.label}{c.required && <span className="text-brand-primary"> *</span>}</label>}
                    {c.type === "textarea" ? (
                      <textarea id={c.key} rows={4} className={inputCls + " !h-auto py-3"} placeholder={c.placeholder} value={vals[c.key] || ""} onFocus={() => evento("field_focus", { campo: c.key })} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })} />
                    ) : c.type === "select" ? (
                      <select id={c.key} className={inputCls} value={vals[c.key] || ""} onFocus={() => evento("field_focus", { campo: c.key })} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}>
                        <option value="">Selecciona…</option>{(c.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : c.type === "checkbox" ? (
                      <label className="flex items-start gap-3 text-sm text-ink-sub cursor-pointer"><input id={c.key} type="checkbox" className="mt-0.5 h-4 w-4 accent-[#e8581a]" checked={!!vals[c.key]} onChange={(e) => setVals({ ...vals, [c.key]: e.target.checked })} />{c.label}{c.required && <span className="text-brand-primary"> *</span>}</label>
                    ) : (
                      <input id={c.key} type={c.type === "email" ? "email" : c.type === "tel" ? "tel" : c.type === "url" ? "url" : "text"} className={inputCls} placeholder={c.placeholder} value={vals[c.key] || ""} autoComplete={c.key === "email" ? "email" : c.key === "nombre" ? "name" : c.type === "tel" ? "tel" : undefined} onFocus={() => evento("field_focus", { campo: c.key })} onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })} />
                    )}
                    {errs[c.key] && <div className="mt-1 text-xs text-brand-red">{errs[c.key]}</div>}
                  </div>
                ))}
                <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
                  <label>Sitio web<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
                </div>
              </div>
              {msg && <div className="mt-4 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-red-300">{msg}</div>}
              <button type="submit" disabled={envio} onClick={() => evento("cta_click")} className="btn-aurora mt-6 w-full h-14 rounded-2xl text-white font-bold text-[16px] disabled:opacity-60">{envio ? "Enviando…" : form.boton_texto}</button>
              <p className="mt-4 text-center text-[11px] text-ink-muted">Tus datos se usan solo para contactarte sobre esta solicitud.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
