"use client";
import { useEffect, useState } from "react";
import { useMotionOk } from "@/components/motion/useMotionOk";

/**
 * Fondo del login: red "plexus" (Pixabay, vídeo 13495 de EnchantedStudios, licencia Pixabay) servida desde
 * /public. El original es blanco sobre negro: el filtro lo tiñe al naranja GOZZ y `screen` hace transparente
 * el negro, así se funde con la aurora y la escena 3D. Pesa 1,9 MB: en móvil, con efectos apagados o con
 * "reducir movimiento" se muestra solo el fotograma fijo y el vídeo ni se descarga.
 */
export function LoginVideo() {
  const motionOk = useMotionOk();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const cls = "login-video absolute inset-0 h-full w-full object-cover";
  return motionOk && wide ? (
    <video className={cls} src="/login-bg.mp4" poster="/login-bg.jpg" autoPlay muted loop playsInline preload="auto" aria-hidden />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={cls} src="/login-bg.jpg" alt="" aria-hidden />
  );
}
