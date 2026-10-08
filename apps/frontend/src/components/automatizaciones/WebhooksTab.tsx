"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash } from "@/lib/bootstrap-icons";
import { AppIcon } from "@/components/ui/AppIcon";
import { EmptyState, Modal, Pill, Switch, api, btnAurora, btnGhost, inputCls, labelCls } from "@/components/marketing/ui";
import { cn } from "@/lib/utils";

/**
 * Webhooks y eventos (Módulo 2 / 8): cada evento del CRM (formulario enviado, cambio de etapa, WhatsApp recibido…) se reenvía
 * a un webhook —normalmente un workflow de n8n— con el contacto y el payload. Aquí se suscriben, se prueban y se auditan.
 */
interface Trig { id: string; nombre: string; evento: string; webhook_url: string; tiene_secreto: boolean; filtro: Record<string, string>; estado: "activo" | "pausado"; ejecuciones: number; fallos: number; ultima: string | null; }
const VACIO = { id: "", nombre: "", evento: "form_submitted", webhook_url: "", secreto: "", cond_campo: "", cond_valor: "", estado: "activo" as Trig["estado"] };
const fecha = (s: string) => new Date(s).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function WebhooksTab({ isAdmin }: { isAdmin: boolean }) {
  const [trigs, setTrigs] = useState<Trig[] | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [evs, setEvs] = useState<any[]>([]);
  const [tipos, setTipos] = useState<{ tipo: string; nombre: string; descripcion: string }[]>([]);
  const [ed, setEd] = useState<typeof VACIO | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [t, r, e, k] = await Promise.all([api("/api/marketing/automatizaciones/triggers"), api("/api/marketing/automatizaciones/ejecuciones?limit=25"), api("/api/marketing/eventos?limit=25"), api("/api/marketing/eventos/tipos")]);
      setTrigs(t.triggers); setRuns(r.ejecuciones); setEvs(e.eventos); setTipos(k.tipos);
    } catch (e: any) { toast.error(e.message); setTrigs([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const nombreEv = (t: string) => (t === "*" ? "Todos los eventos" : tipos.find((x) => x.tipo === t)?.nombre || t);

  const guardar = async () => {
    if (!ed) return;
    if (ed.nombre.trim().length < 2 || !/^https?:\/\//.test(ed.webhook_url)) { toast.error("Nombre y URL válida (http/https) son obligatorios"); return; }
    setSaving(true);
    try {
      const body: any = { nombre: ed.nombre.trim(), evento: ed.evento, webhook_url: ed.webhook_url.trim(), estado: ed.estado, filtro: ed.cond_campo ? { [ed.cond_campo.trim()]: ed.cond_valor } : {} };
      if (ed.secreto) body.secreto = ed.secreto;
      if (ed.id) await api(`/api/marketing/automatizaciones/triggers/${ed.id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/marketing/automatizaciones/triggers", { method: "POST", body: JSON.stringify(body) });
      toast.success("Webhook guardado"); setEd(null); cargar();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const estado = async (t: Trig, v: boolean) => { try { await api(`/api/marketing/automatizaciones/triggers/${t.id}`, { method: "PATCH", body: JSON.stringify({ estado: v ? "activo" : "pausado" }) }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const borrar = async (t: Trig) => { if (!confirm(`¿Eliminar el webhook «${t.nombre}»? El historial de ejecuciones se conserva.`)) return; try { await api(`/api/marketing/automatizaciones/triggers/${t.id}`, { method: "DELETE" }); cargar(); } catch (e: any) { toast.error(e.message); } };
  const probar = async (t: Trig) => { try { await api("/api/marketing/automatizaciones/probar", { method: "POST", body: JSON.stringify({ evento: t.evento === "*" ? "form_submitted" : t.evento }) }); toast.success("Evento de prueba enviado. Revisa las ejecuciones."); setTimeout(cargar, 1500); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="space-y-6">
      <div className="glass-3d rounded-[24px] p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <div className="flex items-center gap-3"><AppIcon name="satellite_antenna" size={40} /><div><div className="kicker !text-[10.5px]">n8n y automatización externa</div><h2 className="text-[28px] leading-none mt-1 text-ink">Webhooks por evento</h2></div></div>
          {isAdmin && <button onClick={() => setEd({ ...VACIO })} className={btnAurora}><Plus className="h-4 w-4" weight="bold" /> Nuevo webhook</button>}
        </div>
        {trigs === null ? <div className="h-32 skeleton rounded-2xl" /> : trigs.length === 0 ? (
          <EmptyState icon="satellite_antenna" title="Sin webhooks" text="Crea uno con la URL de un workflow de n8n y elige qué evento lo dispara: recibirá el contacto, su puntaje y el detalle del evento." />
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trigs.map((t) => (
              <div key={t.id} className={cn("group rounded-2xl border border-line bg-white/[0.03] p-5", t.estado === "pausado" && "opacity-60")}>
                <div className="flex items-start justify-between gap-3"><div className="font-display font-extrabold text-2xl text-ink leading-tight">{t.nombre}</div>{isAdmin && <Switch checked={t.estado === "activo"} onChange={(v) => estado(t, v)} label="Activo" />}</div>
                <div className="mt-1.5"><Pill tone="accent">{nombreEv(t.evento)}</Pill></div>
                <div className="mt-2 text-xs text-ink-muted truncate" title={t.webhook_url}>{t.webhook_url}</div>
                <div className="mt-3 flex items-center gap-4 text-xs text-ink-sub"><span><b className="text-ink">{t.ejecuciones}</b> envíos</span><span className={t.fallos ? "text-brand-red" : ""}><b>{t.fallos}</b> fallos</span>{t.ultima && <span className="ml-auto text-ink-muted">{fecha(t.ultima)}</span>}</div>
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                    <button onClick={() => probar(t)} className={btnGhost + " !h-9 !px-3 !rounded-xl !text-xs"}>Probar</button>
                    <div className="ml-auto flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <button onClick={() => setEd({ id: t.id, nombre: t.nombre, evento: t.evento, webhook_url: t.webhook_url, secreto: "", cond_campo: Object.keys(t.filtro || {})[0] || "", cond_valor: Object.values(t.filtro || {})[0] || "", estado: t.estado })} aria-label="Editar" className="h-9 w-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center"><Pencil className="h-4 w-4 text-ink-sub" /></button>
                      <button onClick={() => borrar(t)} aria-label="Eliminar" className="h-9 w-9 rounded-xl hover:bg-brand-red/10 text-brand-red flex items-center justify-center"><Trash className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="glass-3d rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-4"><AppIcon name="high_voltage" size={34} /><h3 className="text-[26px] leading-none text-ink">Últimas ejecuciones</h3></div>
          {runs.length === 0 ? <p className="text-sm text-ink-muted py-4">Cuando un evento dispare un webhook, verás aquí si llegó bien.</p> : (
            <ul className="divide-y divide-line rounded-2xl border border-line overflow-hidden">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Pill tone={r.estado === "enviado" ? "good" : "bad"}>{r.estado}</Pill>
                  <div className="min-w-0 flex-1"><div className="font-bold text-ink truncate">{r.trigger_nombre || "(webhook eliminado)"}</div><div className="text-xs text-ink-muted truncate">{nombreEv(r.evento)}{r.error ? ` · ${r.error}` : r.status_code ? ` · HTTP ${r.status_code}` : ""}</div></div>
                  <div className="text-right text-xs text-ink-muted whitespace-nowrap">{fecha(r.triggered_at)}{r.duracion_ms != null && <div>{r.duracion_ms} ms</div>}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="glass-3d rounded-[24px] p-6">
          <div className="flex items-center gap-3 mb-4"><AppIcon name="eyes" size={34} /><h3 className="text-[26px] leading-none text-ink">Flujo de eventos</h3></div>
          {evs.length === 0 ? <p className="text-sm text-ink-muted py-4">Aún no hay eventos. Se publican solos al recibir formularios, cambiar etapas, mover tareas, etc.</p> : (
            <ul className="divide-y divide-line rounded-2xl border border-line overflow-hidden">
              {evs.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(232,88,26,0.9)]" />
                  <div className="min-w-0 flex-1"><div className="font-bold text-ink truncate">{nombreEv(e.tipo)}</div><div className="text-xs text-ink-muted truncate">{e.contacto_nombre || "—"}</div></div>
                  <div className="text-xs text-ink-muted whitespace-nowrap">{fecha(e.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal open={!!ed} onClose={() => setEd(null)} title={ed?.id ? "Editar webhook" : "Nuevo webhook"} icon="satellite_antenna">
        {ed && (
          <div className="space-y-4">
            <div><label className={labelCls}>Nombre</label><input className={inputCls} value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} placeholder="Bienvenida por WhatsApp (n8n)" /></div>
            <div><label className={labelCls}>Cuando ocurre…</label><select className={inputCls} value={ed.evento} onChange={(e) => setEd({ ...ed, evento: e.target.value })}><option value="*">Cualquier evento</option>{tipos.map((t) => <option key={t.tipo} value={t.tipo}>{t.nombre}</option>)}</select>{tipos.find((t) => t.tipo === ed.evento)?.descripcion && <p className="mt-1.5 text-xs text-ink-muted">{tipos.find((t) => t.tipo === ed.evento)?.descripcion}</p>}</div>
            <div><label className={labelCls}>URL del webhook</label><input className={inputCls} value={ed.webhook_url} onChange={(e) => setEd({ ...ed, webhook_url: e.target.value })} placeholder="https://n8n.tudominio.com/webhook/…" /></div>
            <div><label className={labelCls}>Secreto (se envía en <code>X-Gozz-Secret</code>){ed.id && " — déjalo vacío para conservar el actual"}</label><input type="password" autoComplete="off" className={inputCls} value={ed.secreto} onChange={(e) => setEd({ ...ed, secreto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className={labelCls}>Solo si el dato…</label><input className={inputCls} value={ed.cond_campo} onChange={(e) => setEd({ ...ed, cond_campo: e.target.value })} placeholder="hacia (opcional)" /></div><div><label className={labelCls}>…vale</label><input className={inputCls} value={ed.cond_valor} onChange={(e) => setEd({ ...ed, cond_valor: e.target.value })} placeholder="ganado" /></div></div>
            <div className="flex justify-end gap-3 pt-1"><button onClick={() => setEd(null)} className={btnGhost}>Cancelar</button><button onClick={guardar} disabled={saving} className={btnAurora}>{saving ? "Guardando…" : "Guardar webhook"}</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
