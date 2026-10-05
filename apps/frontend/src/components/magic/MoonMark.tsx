"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MoonMarkProps { size?: number; className?: string; animated?: boolean; }

/**
 * Isotipo de GOZZ: monograma "G" en un cuadrado de cristal con el punto naranja de la marca.
 * (El nombre del archivo se conserva por compatibilidad con los imports existentes.)
 */
export function MoonMark({ size = 40, className, animated = false }: MoonMarkProps) {
  const svg = (
    <svg width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)} role="img" aria-label="GOZZ">
      <defs>
        <linearGradient id="gz-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1a12" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
        <linearGradient id="gz-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb37a" />
          <stop offset="0.55" stopColor="#e8581a" />
          <stop offset="1" stopColor="#b8460f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="17" fill="url(#gz-bg)" stroke="rgba(232,88,26,0.45)" strokeWidth="1.5" />
      <text x="30" y="44" fontFamily="var(--font-barlow), Arial, sans-serif" fontWeight="800" fontSize="40" fill="url(#gz-g)" textAnchor="middle">G</text>
      <circle cx="47.5" cy="44" r="4.2" fill="#f0ede8" />
    </svg>
  );
  if (!animated) return svg;
  return (
    <motion.div className="inline-flex" animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
      {svg}
    </motion.div>
  );
}
