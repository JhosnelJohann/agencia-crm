"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@/lib/bootstrap-icons";
import { cn } from "@/lib/utils";
import { useChatUnread } from "@/lib/useChatUnread";
import { useWhatsappUnread } from "@/lib/useWhatsappUnread";
import { useTareasPendientes } from "@/lib/useTareasPendientes";
import { useCurrentUser, initialsOf } from "@/lib/auth-user";
import { MoonMark } from "@/components/magic/MoonMark";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";

interface Item { href: string; label: string; icon: Icon3DName; badge?: "chat" | "whatsapp" | "tareas"; }
interface Group { title: string; items: Item[]; }

/**
 * Dock de navegación de GOZZ (rediseño 2026).
 * Un panel de cristal flotante, separado de los bordes de la pantalla, que descansa como una
 * columna de iconos 3D y se despliega al pasar el cursor (o al enfocarlo con teclado) mostrando
 * secciones y etiquetas. Móvil: cajón a pantalla completa con las mismas secciones.
 */
export const NAV_GROUPS: Group[] = [
  {
    title: "Comercial",
    items: [
      { href: "/dashboard", label: "Panel", icon: "bar_chart" },
      { href: "/contactos", label: "Contactos", icon: "identification_card" },
      { href: "/oportunidades", label: "Oportunidades", icon: "bullseye" },
      { href: "/tramites", label: "Servicios", icon: "toolbox" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/embudos", label: "Embudos", icon: "satellite_antenna" },
      { href: "/campanas", label: "Campañas", icon: "megaphone" },
      { href: "/anuncios", label: "Anuncios", icon: "rocket" },
      { href: "/scoring", label: "Scoring", icon: "fire" },
      { href: "/redes", label: "Redes", icon: "loudspeaker" },
    ],
  },
  {
    title: "Operación",
    items: [
      { href: "/tareas", label: "Tareas", icon: "check_mark_button", badge: "tareas" },
      { href: "/drive", label: "Drive", icon: "file_folder" },
      { href: "/automatizaciones", label: "Automatizaciones", icon: "high_voltage" },
      { href: "/reportes", label: "Reportes", icon: "chart_increasing" },
    ],
  },
  {
    title: "Comunicación",
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: "mobile_phone", badge: "whatsapp" },
      { href: "/correo", label: "Correo", icon: "e_mail" },
      { href: "/chat", label: "Chat", icon: "left_speech_bubble", badge: "chat" },
    ],
  },
  {
    title: "Equipo",
    items: [
      { href: "/equipo", label: "Equipo", icon: "handshake" },
      { href: "/asistencia", label: "Asistencia", icon: "alarm_clock" },
      { href: "/configuracion", label: "Ajustes", icon: "gear" },
    ],
  },
];

export function Sidebar({ mobileOpen = false, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const chat = useChatUnread();
  const wa = useWhatsappUnread();
  const tareas = useTareasPendientes();
  const { user } = useCurrentUser();
  const [hover, setHover] = useState(false);
  const badges = { chat, whatsapp: wa, tareas };

  return (
    <>
      {/* ── Escritorio: dock flotante ─────────────────────────────────────────────────── */}
      <motion.aside
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        onFocusCapture={() => setHover(true)}
        onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}
        initial={false}
        animate={{ width: hover ? 272 : 78 }}
        style={{ width: 78 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="hidden lg:flex fixed left-3.5 top-3.5 bottom-3.5 z-50 flex-col glass-3d glass-blur rounded-[28px] overflow-hidden"
      >
        <DockContent pathname={pathname} expanded={hover} badges={badges} user={user} />
      </motion.aside>

      {/* ── Móvil: cajón ──────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="lg:hidden fixed left-2 top-2 bottom-2 z-50 w-[292px] glass-3d glass-blur rounded-[28px] overflow-hidden flex flex-col"
            >
              <DockContent pathname={pathname} expanded badges={badges} user={user} onNavigate={onClose}
                headerExtra={
                  <button onClick={onClose} aria-label="Cerrar menú" className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-ink-sub hover:text-ink hover:bg-white/[0.06]">
                    <X size={18} />
                  </button>
                }
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DockContent({ pathname, expanded, badges, user, onNavigate, headerExtra }: {
  pathname: string; expanded: boolean; badges: Record<"chat" | "whatsapp" | "tareas", number>;
  user: any; onNavigate?: () => void; headerExtra?: React.ReactNode;
}) {
  return (
    <>
      {/* Marca */}
      <div className="relative flex items-center gap-3 h-[76px] shrink-0 px-[18px]">
        <Link href="/dashboard" onClick={onNavigate} aria-label="GOZZ — Panel" className="relative shrink-0">
          <div className="absolute inset-0 rounded-2xl bg-brand-primary/35 blur-xl" />
          <MoonMark size={42} className="relative" />
        </Link>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="min-w-0 leading-none"
            >
              <div className="font-display font-extrabold uppercase text-[24px] tracking-[4px] text-ink">GOZZ<span className="text-brand-primary">.</span></div>
              <div className="mt-1 text-[10px] uppercase tracking-[2.5px] text-ink-muted font-semibold">Marketing OS</div>
            </motion.div>
          )}
        </AnimatePresence>
        {headerExtra}
      </div>

      {/* Navegación por secciones */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin px-3 pb-2" data-lenis-prevent>
        {NAV_GROUPS.map((g, gi) => (
          <div key={g.title} className={cn(gi > 0 && "mt-2")}>
            <div className="h-6 flex items-center px-3">
              {expanded ? (
                <span className="kicker !text-[10.5px] !tracking-[2.5px] !text-ink-muted before:!bg-ink-muted/60">{g.title}</span>
              ) : (
                <span className="mx-auto block h-px w-5 bg-white/10" />
              )}
            </div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const n = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    className="group relative flex items-center gap-3 h-12 rounded-2xl px-[10px] transition-colors hover:bg-white/[0.045]"
                  >
                    {active && (
                      <motion.span
                        layoutId="dock-active"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-brand-primary/25 via-brand-primary/10 to-transparent border border-brand-primary/30 shadow-[0_0_28px_-6px_rgba(232,88,26,0.55)]"
                      />
                    )}
                    {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-brand-primary shadow-[0_0_12px_rgba(232,88,26,0.9)]" />}
                    <span className="relative shrink-0 w-[34px] flex items-center justify-center">
                      <Icon3D name={item.icon} size={active ? 32 : 28} float={active} />
                      {n > 0 && !expanded && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-brand-red text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-[#0c0c0c]">
                          {n > 99 ? "99+" : n}
                        </span>
                      )}
                    </span>
                    {expanded && (
                      <>
                        <span className={cn("relative flex-1 truncate text-[15px] font-semibold tracking-wide", active ? "text-ink" : "text-ink-sub group-hover:text-ink")}>
                          {item.label}
                        </span>
                        {n > 0 && (
                          <span className="relative h-5 min-w-[20px] px-1.5 rounded-full bg-brand-red text-white text-[10px] font-bold flex items-center justify-center">
                            {n > 99 ? "99+" : n}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Tarjeta de usuario */}
      <Link
        href={user?.id ? `/equipo/${user.id}` : "/configuracion"}
        onClick={onNavigate}
        className="relative m-3 mt-1 flex items-center gap-3 rounded-2xl p-2 border border-line bg-white/[0.03] hover:bg-white/[0.06] transition"
      >
        <span className="relative shrink-0 h-10 w-10 rounded-full">
          <span className="halo-ring !rounded-full" />
          <span className="absolute inset-[3px] rounded-full overflow-hidden bg-gradient-to-br from-brand-primary to-brand-gold flex items-center justify-center text-white text-xs font-display font-bold tracking-wide">
            {user?.foto_perfil_url ? <img src={user.foto_perfil_url} alt="" className="h-full w-full object-cover" /> : user ? initialsOf(user.nombre) : "·"}
          </span>
        </span>
        {expanded && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">{user?.nombre || "Mi cuenta"}</span>
            <span className="block truncate text-[10.5px] uppercase tracking-[1.8px] text-ink-muted font-semibold">{(user?.posiciones || [])[0] || user?.nivel_acceso || "Perfil"}</span>
          </span>
        )}
      </Link>
    </>
  );
}
