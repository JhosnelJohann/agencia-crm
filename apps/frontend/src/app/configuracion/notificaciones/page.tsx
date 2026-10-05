"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Sparkles, Volume2, Mail, Smartphone, CheckSquare, MessageSquare, DollarSign, Clock, ArrowLeft, Loader2, Moon, Globe, Save } from "@/lib/bootstrap-icons";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

interface Prefs {
  sonido_notifs: boolean;
  email_notifs: boolean;
  push_notifs: boolean;
  notifs_tareas: boolean;
  notifs_chat: boolean;
  notifs_descuentos: boolean;
  notifs_asistencia: boolean;
  dark_mode: boolean | null;
  locale: string;
}

export default function NotificacionesConfigPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/preferencias").then((r) => r.json()).then((d) => setPrefs(d.preferencias)).finally(() => setLoading(false));
  }, []);

  const toggle = async (field: keyof Prefs, value: boolean | string) => {
    if (!prefs) return;
    const prev = prefs;
    const next = { ...prefs, [field]: value };
    setPrefs(next);
    setSaving(field);
    try {
      const r = await fetch("/api/me/preferencias", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value })
      });
      if (!r.ok) throw new Error("Error");
      toast.success("Guardado", { duration: 1500 });
    } catch (e: any) {
      setPrefs(prev);
      toast.error("No se pudo guardar");
    } finally { setSaving(null); }
  };

  const CHANNELS = [
    { key: "sonido_notifs" as const, icon: Volume2, label: "Sonido", desc: "Reproducir sonido cuando lleguen notificaciones" },
    { key: "email_notifs" as const, icon: Mail, label: "Email", desc: "Recibir resúmenes por correo electrónico" },
    { key: "push_notifs" as const, icon: Smartphone, label: "Push (web)", desc: "Notificaciones push en el navegador" }
  ];

  const EVENTS = [
    { key: "notifs_tareas" as const, icon: CheckSquare, label: "Tareas", desc: "Asignaciones, menciones, cambios de estado", color: "#e8581a" },
    { key: "notifs_chat" as const, icon: MessageSquare, label: "Chat", desc: "Mensajes directos y de grupo", color: "#5d8fa8" },
    { key: "notifs_descuentos" as const, icon: DollarSign, label: "Descuentos", desc: "Solicitudes y aprobaciones", color: "#16b91a" },
    { key: "notifs_asistencia" as const, icon: Clock, label: "Asistencia / Clock", desc: "Break excedido, recordatorios de fichaje", color: "#c96a3d" }
  ];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Link href="/configuracion" className="flex items-center gap-2 text-xs text-ink-sub hover:text-brand-orange font-ui uppercase tracking-wider mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a configuración
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 text-brand-orange font-ui uppercase text-[13px] tracking-[0.12em] mb-3">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Alertas
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight tracking-tight">
            <span className="text-gradient-orange">Notificaciones</span>
          </h1>
          <p className="mt-3 text-ink-sub text-[15px]">Personaliza qué, cómo y cuándo quieres recibir alertas.</p>
        </motion.div>

        {loading || !prefs ? (
          <div className="text-center py-20"><Loader2 className="h-6 w-6 animate-spin inline text-ink-sub" /></div>
        ) : (
          <div className="space-y-4">
            {/* Canales */}
            <div className="bg-bg-darkcard rounded-2xl border border-line overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <h3 className="font-display font-black text-base">Canales</h3>
                <p className="text-[11px] text-ink-sub mt-0.5">Cómo quieres recibir las alertas</p>
              </div>
              <div className="divide-y divide-line">
                {CHANNELS.map((c) => (
                  <ToggleRow key={c.key} icon={c.icon} label={c.label} desc={c.desc} value={prefs[c.key]} onChange={(v) => toggle(c.key, v)} saving={saving === c.key} />
                ))}
              </div>
            </div>

            {/* Tipos de evento */}
            <div className="bg-bg-darkcard rounded-2xl border border-line overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <h3 className="font-display font-black text-base">Tipos de evento</h3>
                <p className="text-[11px] text-ink-sub mt-0.5">Qué eventos te interesan</p>
              </div>
              <div className="divide-y divide-line">
                {EVENTS.map((e) => (
                  <ToggleRow key={e.key} icon={e.icon} label={e.label} desc={e.desc} color={e.color} value={prefs[e.key]} onChange={(v) => toggle(e.key, v)} saving={saving === e.key} />
                ))}
              </div>
            </div>

            {/* General */}
            <div className="bg-bg-darkcard rounded-2xl border border-line overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-line">
                <h3 className="font-display font-black text-base">General</h3>
              </div>
              <div className="divide-y divide-line">
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    <Moon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Modo oscuro</div>
                    <div className="text-[11px] text-ink-sub">Preferencia personal de tema</div>
                  </div>
                  <select value={prefs.dark_mode === null ? "auto" : prefs.dark_mode ? "dark" : "light"}
                    onChange={(e) => { const v = e.target.value; toggle("dark_mode" as any, v === "auto" ? null as any : v === "dark"); }}
                    className="h-10 px-3 rounded-xl bg-bg-darkcard border border-line text-sm outline-none focus:ring-2 focus:ring-brand-orange/25">
                    <option value="auto">Auto</option>
                    <option value="light">Claro</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </div>
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Idioma</div>
                    <div className="text-[11px] text-ink-sub">Idioma de la interfaz</div>
                  </div>
                  <select value={prefs.locale || "es"}
                    onChange={(e) => toggle("locale" as any, e.target.value as any)}
                    className="h-10 px-3 rounded-xl bg-bg-darkcard border border-line text-sm outline-none focus:ring-2 focus:ring-brand-orange/25">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ToggleRow({ icon: Icon, label, desc, value, onChange, color, saving }: { icon: any; label: string; desc: string; value: boolean; onChange: (v: boolean) => void; color?: string; saving?: boolean }) {
  const c = color || "#e8581a";
  return (
    <div className="px-5 py-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c + "15", color: c }}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-[11px] text-ink-sub">{desc}</div>
      </div>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-sub" />}
      <button
        onClick={() => onChange(!value)}
        className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-brand-orange" : "bg-neutral-300")}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
        />
      </button>
    </div>
  );
}
