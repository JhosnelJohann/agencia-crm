"use client";
import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useFx, useFpsGuard } from "./fx";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });
import { LoginVideo } from "./LoginVideo";

/**
 * Cualquier fallo del fondo 3D (WebGL no disponible, chunk que no carga, excepción de render…)
 * se traga en silencio: apaga los efectos y la app sigue funcionando. Un adorno nunca puede
 * tumbar la aplicación.
 */
class SilentBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) {
    console.warn("[fx] Escena 3D desactivada por error:", error);
    try {
      document.documentElement.classList.add("fx-off");
      localStorage.setItem("agencia-fx", "off");
    } catch {}
  }
  render() { return this.state.failed ? null : this.props.children; }
}

/**
 * Fondo persistente (vive en el layout raíz: no se recrea al navegar). Se apaga solo si el
 * equipo es modesto, si el usuario pidió reducir movimiento o si desactivó "Efectos" en la barra.
 * Detrás siempre hay el degradado de aurora en CSS, así que apagado sigue viéndose bien.
 */
export function SceneHost() {
  const [fx] = useFx();
  useFpsGuard();
  const path = usePathname() || "";
  const hero = path.startsWith("/login");
  // El fondo animado (aurora + escena 3D) es un recurso para la experiencia inmersiva del login.
  // Dentro del CRM autenticado el contenido ahora es claro y opaco (.app-main): el fondo quedaría
  // tapado casi siempre, así que no vale la pena el costo de GPU fuera de /login.
  if (!hero) return null;
  return (
    <div className="scene-host" aria-hidden="true">
      <LoginVideo />
      <div className="aurora-mesh" />
      {fx && (
        <SilentBoundary>
          <Scene3D hero={hero} />
        </SilentBoundary>
      )}
    </div>
  );
}
