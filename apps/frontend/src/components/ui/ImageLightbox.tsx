"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from "@/lib/bootstrap-icons";

export interface ImagenVisor {
  id: string;
  url: string;
  nombre?: string | null;
  /** Texto bajo la imagen (pie de foto). */
  pie?: string | null;
}

/**
 * Visor de imágenes a pantalla completa (extraído del chat interno para usarlo también en WhatsApp):
 * zoom con rueda/botones/doble clic, arrastrar cuando hay zoom, ← → entre las imágenes de la
 * conversación, Esc para cerrar y botón de descarga.
 */
export function ImageLightbox({ imagenes, indice, onIndice, onClose }: {
  imagenes: ImagenVisor[];
  indice: number | null;
  onIndice: (i: number) => void;
  onClose: () => void;
}) {
  const [cargada, setCargada] = useState(false);
  const [montado, setMontado] = useState(false);
  const zoom = useSpring(1, { stiffness: 280, damping: 28 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const actual = indice !== null ? imagenes[indice] : null;

  useEffect(() => setMontado(true), []);
  const setZoom = (z: number) => zoom.set(Math.min(5, Math.max(0.4, z)));
  const reset = () => { zoom.set(1); x.set(0); y.set(0); };
  const prev = () => { if (indice !== null && imagenes.length) onIndice(indice > 0 ? indice - 1 : imagenes.length - 1); };
  const next = () => { if (indice !== null && imagenes.length) onIndice(indice < imagenes.length - 1 ? indice + 1 : 0); };

  useEffect(() => {
    if (indice === null) return;
    reset();
    setCargada(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "+" || e.key === "=") setZoom(zoom.get() + 0.25);
      else if (e.key === "-" || e.key === "_") setZoom(zoom.get() - 0.25);
      else if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  if (!montado) return null;
  return createPortal(
    <AnimatePresence>
      {actual && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex flex-col"
        >
          <div className="absolute inset-0 bg-black" style={{
            backgroundImage: `url(${actual.url})`, backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(60px) saturate(1.4) brightness(0.45)", transform: "scale(1.2)",
          }} />
          <div className="absolute inset-0 bg-black/70" />

          <div className="relative z-10 px-5 py-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-ui uppercase tracking-[0.2em] text-white/55">Imagen · {(indice ?? 0) + 1} / {imagenes.length}</div>
              <div className="text-white font-display font-bold truncate">{actual.nombre || "imagen"}</div>
            </div>
            <div className="flex items-center gap-1 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-1">
              <button type="button" onClick={() => setZoom(zoom.get() - 0.25)} aria-label="Alejar" className="h-9 w-9 rounded-xl hover:bg-white/15 text-white flex items-center justify-center"><ZoomOut className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(zoom.get() + 0.25)} aria-label="Acercar" className="h-9 w-9 rounded-xl hover:bg-white/15 text-white flex items-center justify-center"><ZoomIn className="h-4 w-4" /></button>
              <button type="button" onClick={reset} aria-label="Restablecer zoom" className="h-9 w-9 rounded-xl hover:bg-white/15 text-white flex items-center justify-center"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <a href={actual.url} download={actual.nombre || true} onClick={(e) => e.stopPropagation()}
              className="h-10 px-4 rounded-2xl gradient-orange text-white font-ui text-[13px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition">
              <Download className="h-3.5 w-3.5" /> Descargar
            </a>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center"><X className="h-5 w-5" /></button>
          </div>

          {imagenes.length > 1 && (
            <>
              <button type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}

          <motion.div
            key={actual.id}
            initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative z-[5] flex-1 flex flex-col items-center justify-center p-6 overflow-hidden gap-3"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => (zoom.get() > 1.1 ? reset() : setZoom(2))}
            onWheel={(e) => { e.stopPropagation(); setZoom(zoom.get() + (e.deltaY < 0 ? 0.2 : -0.2)); }}
          >
            {!cargada && <div className="absolute h-10 w-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />}
            <motion.img
              src={actual.url} alt={actual.nombre || ""} onLoad={() => setCargada(true)}
              drag dragMomentum={false} style={{ scale: zoom, x, y }}
              className="max-w-[90vw] max-h-[72vh] object-contain rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] select-none cursor-zoom-in"
              draggable={false}
            />
            {actual.pie && <div className="max-w-2xl text-center text-white/90 text-sm whitespace-pre-wrap">{actual.pie}</div>}
          </motion.div>

          <div className="relative z-10 pb-4 text-center text-[12px] font-ui text-white/50">rueda o +/- zoom · ← → navegar · doble clic · Esc cerrar</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
