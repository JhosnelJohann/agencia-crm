"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/lib/bootstrap-icons";
import { cn } from "@/lib/utils";

/**
 * Área con scroll horizontal + "botones fantasma" estilo Bitrix: aparecen al pasar el mouse por el
 * área y se ocultan si no hay a dónde desplazar. Al posicionar el mouse SOBRE una flecha, desplaza
 * automáticamente mientras el cursor siga encima; un clic avanza casi una pantalla. `Shift + rueda`
 * (o gesto horizontal de trackpad) desplaza en toda el área — se escucha en fase de captura para
 * adelantarse a los onWheel de las columnas (que hacen stopPropagation para su scroll vertical).
 *
 * Es el ÚNICO desplazamiento lateral del CRM (tableros, tablas, filas de chips y pestañas), para que
 * todo se comporte igual:
 *  - `size="lg"` (tableros y tablas) o `size="sm"` (chips/pestañas: flechas compactas con degradado).
 *  - `tone="dark"` dentro de islas oscuras (WhatsApp, chat, videollamada).
 *  - En pantallas táctiles no hay flechas: ahí se desliza con el dedo.
 *
 *   <HorizontalScrollArea className="pb-4 scrollbar-thin">
 *     <div className="flex gap-4 min-w-max">{columnas}</div>
 *   </HorizontalScrollArea>
 */
export function HorizontalScrollArea({ children, className, outerClassName, size = "lg", tone = "light", lenisPrevent = false }: {
  children: React.ReactNode;
  /** Clases del contenedor que hace scroll (el que lleva overflow-x-auto). */
  className?: string;
  /** Clases del envoltorio exterior (posición, flex, alto…). */
  outerClassName?: string;
  size?: "lg" | "sm";
  tone?: "light" | "dark";
  /** Marca el área con data-lenis-prevent (para que el scroll suave de la página no la capture). */
  lenisPrevent?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [finePointer, setFinePointer] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onMq = () => setFinePointer(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // sin desborde: que la rueda haga lo de siempre
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        el.scrollLeft += (e.deltaX || e.deltaY);
        update();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    // Observar el CONTENIDO (crece al cargar datos/columnas), no solo el contenedor: un
    // ResizeObserver sobre el contenedor no dispara cuando el contenido desborda.
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild as Element);
    const mo = new MutationObserver(() => update());
    mo.observe(el, { childList: true, subtree: false });
    return () => {
      window.removeEventListener("resize", onResize);
      el.removeEventListener("wheel", onWheel, { capture: true } as any);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  const stopAuto = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  const startAuto = (dir: 1 | -1) => {
    stopAuto();
    const speed = size === "sm" ? 6 : 14; // px por frame (~60fps)
    const step = () => {
      const el = ref.current;
      if (!el) return;
      el.scrollLeft += dir * speed;
      update();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };
  const jump = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    stopAuto();
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  useEffect(() => stopAuto, []);

  const visible = hovered && finePointer;
  const lg = size === "lg";
  const btn = cn(
    "absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center transition-all duration-200 cursor-pointer border shadow-lg",
    lg ? "h-14 w-9 rounded-2xl" : "h-7 w-7 rounded-full",
    tone === "dark"
      ? "bg-[#0f172a]/80 border-white/10 text-slate-100 backdrop-blur hover:bg-[#1e293b]"
      : "bg-white/80 border-black/5 text-ink backdrop-blur hover:bg-white",
    visible ? "opacity-100" : "opacity-0 pointer-events-none"
  );
  // Degradado en el borde (solo filas compactas): insinúa que hay más contenido.
  const fade = (side: "left" | "right") => cn(
    "pointer-events-none absolute inset-y-0 w-10 z-10 transition-opacity",
    side === "left" ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l",
    tone === "dark" ? "from-[#0f172a]" : "from-[var(--content-fill,#fff)]",
    "to-transparent"
  );
  const icon = lg ? "h-6 w-6" : "h-4 w-4";

  return (
    <div
      className={cn("relative", outerClassName)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); stopAuto(); }}
    >
      <div ref={ref} onScroll={update} className={cn("overflow-x-auto", className)} {...(lenisPrevent ? { "data-lenis-prevent": true } : {})}>
        {children}
      </div>
      {!lg && canLeft && <div className={fade("left")} aria-hidden />}
      {!lg && canRight && <div className={fade("right")} aria-hidden />}
      {canLeft && (
        <button
          type="button" aria-label="Desplazar a la izquierda" tabIndex={-1}
          onMouseEnter={() => startAuto(-1)} onMouseLeave={stopAuto} onClick={() => jump(-1)}
          className={cn(btn, lg ? "left-1" : "left-0.5")}
        >
          <ChevronLeft className={icon} strokeWidth={2.5} />
        </button>
      )}
      {canRight && (
        <button
          type="button" aria-label="Desplazar a la derecha" tabIndex={-1}
          onMouseEnter={() => startAuto(1)} onMouseLeave={stopAuto} onClick={() => jump(1)}
          className={cn(btn, lg ? "right-1" : "right-0.5")}
        >
          <ChevronRight className={icon} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
