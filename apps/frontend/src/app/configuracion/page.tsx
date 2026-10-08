"use client";
import { AppIcon } from "@/components/ui/AppIcon";
import { WireShape } from "@/components/motion/WireShape";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, KeyRound, Bell, Palette, ShieldCheck, Sparkles, ArrowRight, Building2, Cog } from "@/lib/bootstrap-icons";
import { AppShell } from "@/components/AppShell";

const SECTIONS = [
  { href: "/configuracion/usuarios", label: "Usuarios del equipo", desc: "Crear, editar y asignar roles", Icon: Users, color: "#e8581a" },
  { href: "/configuracion/departamentos", label: "Departamentos", desc: "Estructura organizacional", Icon: Building2, color: "#f0b040" },
  { href: "/configuracion/pipeline", label: "Pipeline & Automations", desc: "Etapas, colores, disparadores y campos obligatorios", Icon: Cog, color: "#c96a3d" },
  { href: "/configuracion/notificaciones", label: "Notificaciones", desc: "Preferencias de alertas", Icon: Bell, color: "#e30b0b" },
  { href: "/configuracion/api-keys", label: "API Keys", desc: "Llaves públicas para integraciones externas", Icon: KeyRound, color: "#5d8fa8" },
  { href: "/configuracion/seguridad", label: "Seguridad", desc: "Auditoría y sesiones activas", Icon: ShieldCheck, color: "#94a3b8" }
];

// La "Papelera / Archivos sin identificar" se movió al modal de papelera del Drive (Fase B3) — ya no está acá.

export default function ConfiguracionPage() {
  const sections = SECTIONS;
  return (
    <AppShell>
      <div className="max-w-[1500px] mx-auto px-3.5 lg:px-5 pt-5 pb-14">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-3d rounded-[28px] px-6 py-5 mb-5 relative overflow-hidden isolate">
          <div className="tech-grid pointer-events-none absolute inset-0 -z-10" aria-hidden />
          <WireShape kind="cube" size={260} className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-50 -z-10 hidden lg:block" />
          <div className="flex items-center gap-5 min-w-0">
            <AppIcon name="gear" size={64} className="shrink-0" />
            <div className="min-w-0">
              <div className="kicker">Equipo · administración</div>
              <h1 className="mt-1.5 text-[clamp(28px,3.4vw,44px)] leading-none text-ink">Ajustes <span className="text-brand-orange text-orange-glow">del CRM</span></h1>
              <p className="mt-1.5 text-ink-sub text-[14px]">Usuarios, pipeline, notificaciones y seguridad. Solo administradores.</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s, i) => {
            const Icon = s.Icon;
            return (
              <motion.div
                key={s.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  href={s.href}
                  className="group glass rounded-2xl p-6 flex items-start gap-4 hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + "15" }}>
                    <Icon className="h-6 w-6" strokeWidth={1.5} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-display font-black text-base">{s.label}</div>
                      <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" strokeWidth={1.5} />
                    </div>
                    <div className="text-xs text-ink-sub mt-0.5">{s.desc}</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
