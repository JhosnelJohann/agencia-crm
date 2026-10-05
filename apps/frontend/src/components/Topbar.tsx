"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, SignOut, User, Command as CommandIcon, MagicWand, List, Plus } from "@/lib/bootstrap-icons";
import { toast } from "sonner";
import { VoiceToTaskModal } from "./VoiceToTaskModal";
import { ClockButton } from "./clock/ClockButton";
import { CommandPalette } from "@/components/magic/CommandPalette";
import { NotificationsPanel } from "./NotificationsPanel";
import { NAV_GROUPS } from "./Sidebar";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { useFx } from "@/components/magic/fx";
import { cn } from "@/lib/utils";

interface Me { id: string; email: string; nombre: string; nivel_acceso: string; foto_perfil_url?: string | null; posiciones?: string[]; departamento?: string | null; }

const QUICK: { label: string; hint: string; href: string; icon: Icon3DName }[] = [
  { label: "Nueva oportunidad", hint: "Pipeline comercial", href: "/oportunidades", icon: "bullseye" },
  { label: "Nuevo contacto", hint: "Lead o cliente", href: "/contactos", icon: "identification_card" },
  { label: "Nueva tarea", hint: "Para ti o el equipo", href: "/tareas", icon: "check_mark_button" },
  { label: "Redactar correo", hint: "Desde tus buzones", href: "/correo", icon: "e_mail" },
];

/** Navbar flotante de GOZZ: identidad del módulo a la izquierda, comando central, acciones a la derecha. */
export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [fx, setFx] = useFx();
  const menuRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user)).catch(() => {});
    const onVoiceOpen = () => setVoiceOpen(true);
    window.addEventListener("voice-to-task-open", onVoiceOpen);
    return () => window.removeEventListener("voice-to-task-open", onVoiceOpen);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sesión cerrada");
    setTimeout(() => { window.location.href = "/login"; }, 400);
  };

  // Identidad del módulo actual (sección + etiqueta + icono 3D), de la misma fuente que el dock.
  let sec = { group: "GOZZ", label: "Panel", icon: "bar_chart" as Icon3DName, index: 1 };
  NAV_GROUPS.forEach((g, gi) => g.items.forEach((it) => {
    if (pathname === it.href || pathname.startsWith(it.href + "/")) sec = { group: g.title, label: it.label, icon: it.icon, index: gi + 1 };
  }));

  const initials = me?.nombre?.split(" ").map((s) => s[0]).slice(0, 2).join("") || "?";
  const iconBtn = "h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl bg-white/[0.04] border border-line hover:border-brand-primary/30 hover:bg-white/[0.08] transition";

  return (
    <>
      <header className="sticky top-3.5 z-40 mx-3.5 lg:mx-5 mt-3.5">
        <div className="glass-3d glass-blur rounded-[26px] flex items-center gap-2 sm:gap-3 pl-2.5 sm:pl-3 pr-2.5 sm:pr-3 py-2.5">
          <button onClick={onMenuClick} aria-label="Abrir menú" className={cn(iconBtn, "lg:hidden")}>
            <List className="h-5 w-5" weight="bold" />
          </button>

          {/* Identidad del módulo */}
          <div className="hidden sm:flex items-center gap-3 pl-1.5 pr-4 min-w-0">
            <Icon3D name={sec.icon} size={34} float />
            <div className="leading-none min-w-0">
              <div className="kicker !text-[10.5px] !tracking-[2.6px] whitespace-nowrap">{String(sec.index).padStart(2, "0")} · {sec.group}</div>
              <div className="mt-1 font-display font-bold uppercase text-[19px] tracking-[1.6px] text-ink truncate">{sec.label}</div>
            </div>
          </div>

          {/* Comando central */}
          <button
            onClick={() => setCmdOpen(true)}
            aria-label="Buscar o ejecutar comando"
            className="group flex items-center gap-3 flex-1 min-w-0 max-w-xl mx-auto h-11 px-3 sm:px-4 rounded-2xl bg-black/25 border border-line hover:border-brand-primary/35 transition-all"
          >
            <MagnifyingGlass className="h-4 w-4 text-ink-sub group-hover:text-brand-primary transition-colors shrink-0" />
            <span className="text-sm text-ink-sub flex-1 text-left truncate hidden sm:block">Busca contactos, oportunidades, tareas…</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-ink-sub bg-white/[0.06] rounded-md px-1.5 py-1 ml-auto">
              <CommandIcon className="h-2.5 w-2.5" weight="bold" />K
            </span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Crear */}
            <div className="relative" ref={quickRef}>
              <button onClick={() => setQuickOpen((v) => !v)} className="btn-aurora h-11 px-4 rounded-2xl text-white font-bold text-sm inline-flex items-center gap-2">
                <Plus className="h-4 w-4" weight="bold" /><span className="hidden md:inline">Crear</span>
              </button>
              <AnimatePresence>
                {quickOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-3 w-72 glass-3d glass-blur rounded-3xl p-2 z-50"
                  >
                    {QUICK.map((q) => (
                      <button key={q.href} onClick={() => { setQuickOpen(false); router.push(q.href); }}
                        className="group w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.06] transition">
                        <Icon3D name={q.icon} size={30} />
                        <span className="leading-tight">
                          <span className="block text-sm font-bold text-ink">{q.label}</span>
                          <span className="block text-[11px] text-ink-muted">{q.hint}</span>
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => setVoiceOpen(true)} title="Voz → Tarea con IA" className={cn(iconBtn, "hidden md:flex text-brand-primary")}>
              <MagicWand className="h-[18px] w-[18px]" weight="duotone" />
            </button>

            <button
              onClick={() => setFx(!fx)}
              title={fx ? "Efectos 3D activados — clic para desactivar" : "Efectos 3D desactivados — clic para activar"}
              aria-pressed={fx}
              className={cn(iconBtn, "hidden sm:flex", fx && "border-brand-primary/40 bg-brand-primary/10")}
            >
              <Icon3D name={fx ? "sparkles" : "dizzy"} size={22} />
            </button>

            <div className="hidden sm:block"><ClockButton /></div>
            <NotificationsPanel />

            {/* Usuario */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((v) => !v)} className="relative h-11 w-11 rounded-2xl" aria-label="Cuenta">
                <span className="halo-ring !rounded-2xl" />
                <span className="absolute inset-[3px] rounded-[13px] overflow-hidden bg-gradient-to-br from-brand-primary to-brand-gold flex items-center justify-center text-white font-display font-bold text-sm tracking-wide">
                  {me?.foto_perfil_url ? <img src={me.foto_perfil_url} alt={me.nombre} className="h-full w-full object-cover" /> : initials}
                </span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-3 w-64 glass-3d glass-blur rounded-3xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-3.5 border-b border-line">
                      <div className="font-bold text-sm truncate text-ink">{me?.nombre}</div>
                      <div className="text-xs text-ink-muted truncate">{me?.email}</div>
                    </div>
                    <button onClick={() => { if (me?.id) window.location.href = `/equipo/${me.id}`; }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.05] transition text-left text-ink">
                      <User className="h-4 w-4 text-ink-sub" weight="duotone" /> Mi perfil
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-red/10 transition text-left text-brand-red">
                      <SignOut className="h-4 w-4" weight="duotone" /> Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <VoiceToTaskModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onCreated={() => {}} />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
