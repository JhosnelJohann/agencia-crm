"use client";
import { useEffect, useState } from "react";
import { startHeartbeat } from "@/lib/presence";
import { IncomingCallModal } from "@/components/chat/IncomingCallModal";
import { MessageToast } from "@/components/MessageToast";
import { WhatsappNotifier } from "@/components/whatsapp/WhatsappNotifier";
import { SuperNotifyBanner } from "@/components/tareas/SuperNotifyBanner";
import { TaskNotifier } from "@/components/tareas/TaskNotifier";
import { DescuentoSolicitudBanner } from "@/components/descuentos/DescuentoSolicitudBanner";
import { SolicitudOportunidadBanner } from "@/components/oportunidad/SolicitudOportunidadBanner";
import { PushSubscriber } from "@/components/PushSubscriber";
import { PageTitle } from "./PageTitle";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { motion } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { startHeartbeat(); }, []);
  // Ahorro de CPU: pausa las animaciones CSS (aurora, marquee, etc.) cuando la
  // pestaña no está visible. La mayoría del día el CRM está de fondo.
  useEffect(() => {
    const apply = () => document.documentElement.classList.toggle("tab-hidden", document.hidden);
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled && r.status === 401 && typeof window !== "undefined") {
          window.location.replace("/login");
        }
      } catch {}
    };
    check();
    const id = setInterval(check, 2 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return (
    <>
      <PageTitle />
      <div className="min-h-screen text-ink relative">
        <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
        <div className="min-w-0 flex flex-col relative lg:pl-[104px]">
          <Topbar onMenuClick={() => setNavOpen(true)} />
          <main className="flex-1 relative app-main">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <IncomingCallModal />
      <MessageToast />
      <WhatsappNotifier />
      <SuperNotifyBanner />
      <TaskNotifier />
      <DescuentoSolicitudBanner />
      <SolicitudOportunidadBanner />
      <PushSubscriber />
    </>
  );
}
