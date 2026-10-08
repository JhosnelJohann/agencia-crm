"use client";
import { useEffect, useState } from "react";
import { useFx } from "@/components/magic/fx";

/**
 * ¿Se pueden animar cosas continuas ahora mismo? Solo si los efectos están activos (botón de la barra /
 * guardián de FPS de fx.ts), el usuario no pidió "reducir movimiento" y la pestaña está visible.
 * Las animaciones de ENTRADA no dependen de esto: deben dejar el contenido visible pase lo que pase.
 */
export function useMotionOk(): boolean {
  const [fx] = useFx();
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    const onVis = () => setVisible(!document.hidden);
    onMq(); onVis();
    mq.addEventListener("change", onMq);
    document.addEventListener("visibilitychange", onVis);
    return () => { mq.removeEventListener("change", onMq); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return fx && !reduced && visible;
}
