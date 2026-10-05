"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon3D } from "@/components/ui/Icon3D";
import { EASE, Pill, api } from "@/components/marketing/ui";

/** Pestaña «marketing» de la ficha del contacto: temperatura (score), origen, formularios, campañas y línea de eventos. */
const EVENTOS: Record<string, string> = {
  form_submitted: "Llenó un formulario", contact_created: "Contacto creado", stage_changed: "Cambió de etapa", whatsapp_message_received: "Escribió por WhatsApp",
  task_completed: "Tarea completada", campaign_opened: "Abrió un correo", campaign_clicked: "Hizo clic en un correo", campaign_unsubscribed: "Se dio de baja",
};
const fecha = (s: string) => new Date(s).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const temp = (s: number) => (s >= 60 ? { l: "Caliente", tone: "bad" as const, icon: "fire" as const } : s >= 25 ? { l: "Tibio", tone: "warn" as const, icon: "sparkles" as const } : { l: "Frío", tone: "neutral" as const, icon: "hourglass_done" as const });

export function MarketingTab({ contactoId }: { contactoId: string }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/api/marketing/contacto/${contactoId}`).then(setD).catch(() => setD({ score: 0, historial: [], atribucion: [], envios: [], eventos: [], campanas: [] })); }, [contactoId]);
  if (!d) return <div className="grid md:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="glass-3d rounded-[24px] h-48 skeleton" />)}</div>;
  const t = temp(d.score);
  const origen = d.atribucion?.[0];

  return (
    <div className="grid grid-cols-12 gap-5">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="glass-3d rounded-[24px] p-6 col-span-12 md:col-span-4">
        <div className="kicker !text-[10.5px]">Temperatura</div>
        <div className="mt-3 flex items-center gap-4">
          <Icon3D name={t.icon} size={64} float />
          <div><div className="font-display font-extrabold text-[64px] leading-none tabular-nums text-ink">{d.score}</div><Pill tone={t.tone}>{t.l}</Pill></div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/[0.06] overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, d.score)}%` }} transition={{ duration: 1.1, ease: EASE }} className="h-full rounded-full bg-gradient-to-r from-brand-gold via-brand-primary to-orange-300" /></div>
        <ul className="mt-4 space-y-1.5">
          {d.historial.slice(0, 6).map((h: any, i: number) => (
            <li key={i} className="flex items-center gap-2 text-xs"><span className={h.puntos >= 0 ? "text-brand-green font-bold tabular-nums" : "text-brand-red font-bold tabular-nums"}>{h.puntos > 0 ? "+" : ""}{h.puntos}</span><span className="text-ink-sub truncate">{h.regla || EVENTOS[h.evento] || h.evento}</span><span className="ml-auto text-ink-muted whitespace-nowrap">{fecha(h.created_at)}</span></li>
          ))}
          {d.historial.length === 0 && <li className="text-xs text-ink-muted">Aún sin puntos.</li>}
        </ul>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.06 }} className="glass-3d rounded-[24px] p-6 col-span-12 md:col-span-4">
        <div className="kicker !text-[10.5px]">Origen del lead</div>
        {origen ? (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-3"><Icon3D name="compass" size={44} /><div><div className="font-display font-extrabold text-2xl text-ink capitalize">{origen.utm_source || "directo"}</div><div className="text-xs text-ink-muted">{origen.utm_medium || "—"} · {origen.metodo === "fbclid" ? "Meta (fbclid)" : "solo UTM"}</div></div></div>
            {origen.utm_campaign && <div><span className="text-ink-muted text-xs uppercase tracking-[1.6px]">Campaña</span><div className="text-ink font-semibold">{origen.utm_campaign}</div></div>}
            {origen.utm_content && <div><span className="text-ink-muted text-xs uppercase tracking-[1.6px]">Anuncio</span><div className="text-ink font-semibold">{origen.utm_content}</div></div>}
          </div>
        ) : <p className="mt-3 text-sm text-ink-muted">Este contacto no llegó por un formulario con seguimiento.</p>}
        <div className="mt-5 kicker !text-[10.5px]">Formularios</div>
        <ul className="mt-2 space-y-1.5">{d.envios.map((e: any) => <li key={e.id} className="text-sm text-ink flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />{e.formulario}<span className="ml-auto text-xs text-ink-muted">{fecha(e.created_at)}</span></li>)}{d.envios.length === 0 && <li className="text-xs text-ink-muted">Ninguno.</li>}</ul>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.12 }} className="glass-3d rounded-[24px] p-6 col-span-12 md:col-span-4">
        <div className="kicker !text-[10.5px]">Campañas de correo</div>
        <ul className="mt-3 space-y-2">
          {d.campanas.map((c: any, i: number) => (
            <li key={i} className="rounded-xl border border-line bg-white/[0.03] px-3 py-2.5"><div className="font-bold text-ink text-sm truncate">{c.nombre}</div><div className="mt-1 flex gap-1.5 flex-wrap"><Pill tone={c.estado === "enviado" ? "good" : c.estado === "baja" ? "warn" : "neutral"}>{c.estado}</Pill>{c.abierto_at && <Pill tone="accent">abierto</Pill>}{c.clic_at && <Pill tone="good">clic</Pill>}</div></li>
          ))}
          {d.campanas.length === 0 && <li className="text-sm text-ink-muted">No ha recibido campañas.</li>}
        </ul>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.18 }} className="glass-3d rounded-[24px] p-6 col-span-12">
        <div className="flex items-center gap-3 mb-4"><Icon3D name="high_voltage" size={34} float /><h3 className="text-[26px] leading-none text-ink">Línea de eventos</h3></div>
        {d.eventos.length === 0 ? <p className="text-sm text-ink-muted">Todavía no hay actividad registrada.</p> : (
          <ol className="relative border-l border-line ml-3 space-y-4">
            {d.eventos.map((e: any) => (
              <li key={e.id} className="ml-5">
                <span className="absolute -left-[5px] h-2.5 w-2.5 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(232,88,26,0.9)]" />
                <div className="font-bold text-ink text-sm">{EVENTOS[e.tipo] || e.tipo}</div>
                <div className="text-xs text-ink-muted">{fecha(e.created_at)}{e.payload?.formulario_nombre ? ` · ${e.payload.formulario_nombre}` : ""}{e.payload?.hacia ? ` · ${e.payload.desde || "—"} → ${e.payload.hacia}` : ""}</div>
              </li>
            ))}
          </ol>
        )}
      </motion.section>
    </div>
  );
}
