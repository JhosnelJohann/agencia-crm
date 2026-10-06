"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, MessageSquare,
  FileText, BarChart3, Settings, KeyRound, Search, UserPlus,
  Plus, LogOut, Mic, Sparkles, ArrowDown, ArrowUp, CornerDownLeft
} from "@/lib/bootstrap-icons";

interface Action {
  id: string;
  label: string;
  subtitle?: string;
  icon: any;
  iconColor?: string;
  keywords?: string;
  onSelect: () => void;
  section?: string;
  shortcut?: string;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (href: string) => { router.push(href); onOpenChange(false); };

  const nav: Action[] = [
    { id: "dash", label: "Dashboard", subtitle: "Vista general del CRM", icon: LayoutDashboard, iconColor: "#e8581a", section: "Navegar", onSelect: () => go("/dashboard"), shortcut: "G D" },
    { id: "cont", label: "Contactos", subtitle: "Base de leads y clientes", icon: Users, iconColor: "#5d8fa8", section: "Navegar", onSelect: () => go("/contactos"), shortcut: "G C" },
    { id: "opo", label: "Oportunidades", subtitle: "Pipeline comercial", icon: Briefcase, iconColor: "#c96a3d", section: "Navegar", onSelect: () => go("/oportunidades"), shortcut: "G O" },
    { id: "tar", label: "Tareas", subtitle: "To-do del equipo", icon: CheckSquare, iconColor: "#16b91a", section: "Navegar", onSelect: () => go("/tareas"), shortcut: "G T" },
    { id: "tra", label: "Servicios", subtitle: "Catálogo de servicios de la agencia", icon: FileText, iconColor: "#f0b040", section: "Navegar", onSelect: () => go("/tramites") },
    { id: "emb", label: "Embudos y formularios", subtitle: "Captación con UTM", icon: FileText, iconColor: "#e8581a", section: "Marketing", onSelect: () => go("/embudos") },
    { id: "cam", label: "Campañas de correo", subtitle: "Segmentos, envíos y métricas", icon: FileText, iconColor: "#e8581a", section: "Marketing", onSelect: () => go("/campanas") },
    { id: "ads", label: "Anuncios y atribución", subtitle: "Meta Ads, CPL y ROAS", icon: BarChart3, iconColor: "#e8581a", section: "Marketing", onSelect: () => go("/anuncios") },
    { id: "sco", label: "Lead scoring", subtitle: "Reglas y ranking de leads", icon: BarChart3, iconColor: "#e8581a", section: "Marketing", onSelect: () => go("/scoring") },
    { id: "red", label: "Redes sociales", subtitle: "Marcas y redes en Metricool", icon: Users, iconColor: "#e8581a", section: "Marketing", onSelect: () => go("/redes") },
    { id: "cha", label: "Chat interno", subtitle: "Mensajes del equipo", icon: MessageSquare, iconColor: "#06BCC1", section: "Navegar", onSelect: () => go("/chat") },
    { id: "rep", label: "Reportes", subtitle: "Análisis y métricas", icon: BarChart3, iconColor: "#b8460f", section: "Navegar", onSelect: () => go("/reportes") },
    { id: "con2", label: "Configuración", subtitle: "Panel admin", icon: Settings, iconColor: "#94a3b8", section: "Navegar", onSelect: () => go("/configuracion") },
    { id: "api", label: "API Keys", subtitle: "Integraciones externas", icon: KeyRound, iconColor: "#0EA5E9", section: "Admin", onSelect: () => go("/configuracion/api-keys") },
    { id: "usr", label: "Gestión de usuarios", subtitle: "Equipo y roles", icon: UserPlus, iconColor: "#EC4899", section: "Admin", onSelect: () => go("/configuracion/usuarios") },
  ];

  const actions: Action[] = [
    { id: "new-op", label: "Nueva oportunidad", subtitle: "Crear oportunidad en el pipeline", icon: Plus, iconColor: "#e8581a", section: "Acciones rápidas", onSelect: () => go("/oportunidades") },
    { id: "new-ct", label: "Nuevo contacto", subtitle: "Agregar lead/cliente", icon: Plus, iconColor: "#5d8fa8", section: "Acciones rápidas", onSelect: () => go("/contactos") },
    { id: "new-tk", label: "Nueva tarea", subtitle: "To-do nuevo", icon: Plus, iconColor: "#16b91a", section: "Acciones rápidas", onSelect: () => go("/tareas") },
    { id: "voice", label: "Voice → Task con IA", subtitle: "Graba una nota y Claude crea la tarea", icon: Mic, iconColor: "#c96a3d", section: "Acciones rápidas", onSelect: () => { onOpenChange(false); window.dispatchEvent(new Event("voice-to-task-open")); } },
    { id: "logout", label: "Cerrar sesión", subtitle: "Salir del CRM", icon: LogOut, iconColor: "#e30b0b", section: "Sistema", onSelect: async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; } },
  ];

  const all = [...nav, ...actions];
  const sections = Array.from(new Set(all.map(a => a.section || "Otros")));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-start justify-center p-4 pt-24 animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Glow exterior */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-brand-orange/30 via-amber-400/20 to-brand-orange/30 blur-2xl opacity-60 pointer-events-none" />

        <div className="relative modal-surface rounded-2xl overflow-hidden">
          <Command label="Command" shouldFilter>
            {/* Search hero */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-gradient-to-b from-orange-900/10 to-transparent">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-orange to-amber-500 flex items-center justify-center shadow-sm shadow-brand-orange/20">
                <Search className="h-4 w-4 text-white" strokeWidth={2.4} />
              </div>
              <Command.Input
                placeholder="Escribe un comando o busca..."
                className="flex-1 bg-transparent outline-none text-[15px] text-white placeholder:text-neutral-400 font-medium"
                autoFocus
              />
              <kbd className="text-[12px] font-ui font-black uppercase tracking-wider px-2 py-1 rounded-md bg-white/10 text-neutral-300 border border-white/10">ESC</kbd>
            </div>

            {/* Lista */}
            <Command.List className="max-h-[440px] overflow-y-auto scrollbar-thin p-2">
              <Command.Empty className="py-12 text-center">
                <div className="inline-flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-900/30 to-amber-900/30 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-brand-orange" strokeWidth={2} />
                  </div>
                  <p className="text-sm font-display font-black text-neutral-300">Sin resultados</p>
                  <p className="text-xs text-ink-sub">Probá con otro término o presiona ESC para cerrar</p>
                </div>
              </Command.Empty>

              {sections.map((section) => (
                <Command.Group
                  key={section}
                  heading={section}
                  className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-ui [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-ink-sub dark:[&_[cmdk-group-heading]]:text-neutral-500"
                >
                  {all.filter(a => (a.section || "Otros") === section).map(action => {
                    const Icon = action.icon;
                    const color = action.iconColor || "#e8581a";
                    return (
                      <Command.Item
                        key={action.id}
                        onSelect={action.onSelect}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border-l-2 border-transparent aria-selected:border-brand-orange aria-selected:bg-gradient-to-r aria-selected:from-orange-900/20 aria-selected:to-transparent aria-selected:shadow-sm"
                      >
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-aria-selected:scale-105"
                          style={{ background: color + "15", color }}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-white truncate group-aria-selected:text-brand-orange transition-colors">
                            {action.label}
                          </div>
                          {action.subtitle && (
                            <div className="text-[11px] text-neutral-400 truncate">
                              {action.subtitle}
                            </div>
                          )}
                        </div>
                        {action.shortcut && (
                          <kbd className="text-[11px] font-ui font-black uppercase tracking-wider px-1.5 py-1 rounded-md bg-white/10 text-neutral-300 border border-white/10 shrink-0">
                            {action.shortcut}
                          </kbd>
                        )}
                        <CornerDownLeft className="h-3 w-3 text-neutral-600 opacity-0 group-aria-selected:opacity-100 transition-opacity shrink-0" strokeWidth={2} />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>

            {/* Footer */}
            <div className="border-t border-white/5 px-4 py-2.5 bg-white/[0.02] flex items-center gap-4 text-[12px] font-ui text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-bold"><ArrowUp className="h-2.5 w-2.5 inline" /></kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-bold"><ArrowDown className="h-2.5 w-2.5 inline" /></kbd>
                </span>
                Navegar
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 font-bold flex items-center gap-0.5"><CornerDownLeft className="h-2.5 w-2.5" /></kbd>
                Seleccionar
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-brand-orange" /> GOZZ CRM
              </span>
            </div>
          </Command>
        </div>
      </div>
    </div>
  );
}
