"use client";
import { useEffect } from "react";

/** Un solo listener global: el brillo del cristal (.glass-3d) sigue al cursor (vars --mx/--my). */
export function CursorGlow() {
  useEffect(() => {
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = (e.target as HTMLElement | null)?.closest?.(".glass-3d") as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => { document.removeEventListener("pointermove", move); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return null;
}
