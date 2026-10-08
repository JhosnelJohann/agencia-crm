"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { iconTileStyle } from "./AppIcon";

/**
 * Logos oficiales (SVG inline, sin peticiones) de las plataformas con las que trabaja el CRM.
 * Van en la misma ficha que AppIcon (fondo tenue del color de la marca) para alinear en el menú.
 */
export type BrandName = "whatsapp" | "meta" | "instagram" | "gmail";

const BRAND_COLOR: Record<BrandName, string> = {
  whatsapp: "#25D366",
  meta: "#0082FB",
  instagram: "#D62976",
  gmail: "#EA4335",
};

function Glyph({ brand, size }: { brand: BrandName; size: number }) {
  const id = useId().replace(/:/g, "");
  switch (brand) {
    case "whatsapp":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
          />
        </svg>
      );
    case "meta":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id={`m${id}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#0064E1" />
              <stop offset="0.6" stopColor="#0073EE" />
              <stop offset="1" stopColor="#0082FB" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#m${id})`}
            d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <radialGradient id={`i${id}`} cx="0.3" cy="1.07" r="1.3">
              <stop offset="0" stopColor="#FEDA75" />
              <stop offset="0.25" stopColor="#FA7E1E" />
              <stop offset="0.5" stopColor="#D62976" />
              <stop offset="0.75" stopColor="#962FBF" />
              <stop offset="1" stopColor="#4F5BD5" />
            </radialGradient>
          </defs>
          <g fill="none" stroke={`url(#i${id})`} strokeWidth="2.1">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.4" />
          </g>
          <circle cx="17.4" cy="6.6" r="1.25" fill={`url(#i${id})`} />
        </svg>
      );
    case "gmail":
      return (
        <svg width={size} height={size} viewBox="52 42 88 66" aria-hidden>
          <path fill="#4285F4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
          <path fill="#34A853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
          <path fill="#FBBC04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" />
          <path fill="#EA4335" d="M72 74V48l24 18 24-18v26L96 92" />
          <path fill="#C5221F" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" />
        </svg>
      );
  }
}

export function BrandLogo({
  brand, size = 28, bare = false, active = false, className,
}: {
  brand: BrandName;
  size?: number;
  bare?: boolean;
  /** Seleccionado: ficha blanca para que el logo conserve sus colores oficiales. */
  active?: boolean;
  className?: string;
}) {
  if (bare) return <span className={cn("inline-flex shrink-0", className)}><Glyph brand={brand} size={size} /></span>;
  const tile = iconTileStyle(BRAND_COLOR[brand], size);
  return (
    <span
      className={cn("app-icon inline-flex items-center justify-center shrink-0", className)}
      style={active ? { ...tile, background: "#fff", boxShadow: `inset 0 0 0 1px ${BRAND_COLOR[brand]}55` } : tile}
      aria-hidden
    >
      <Glyph brand={brand} size={Math.round(size * 0.6)} />
    </span>
  );
}
