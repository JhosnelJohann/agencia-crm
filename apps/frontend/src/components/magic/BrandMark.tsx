"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props { size?: "sm" | "md" | "lg" | "xl"; className?: string; animated?: boolean; tm?: boolean; surface?: "dark" | "light"; }

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[17px] tracking-[3px]",
  md: "text-[24px] tracking-[4px]",
  lg: "text-5xl md:text-6xl tracking-[6px]",
  xl: "text-7xl md:text-9xl tracking-[8px]",
};

/** Wordmark GOZZ: Barlow Condensed 800, degradado cálido y punto naranja. */
export function BrandMark({ size = "md", className, animated = true }: Props) {
  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 6 } : undefined}
      animate={animated ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn("inline-flex items-baseline select-none font-display font-extrabold uppercase leading-none", SIZES[size], className)}
    >
      <span className="text-shimmer">GOZZ</span><span className="text-brand-orange text-orange-glow">.</span>
    </motion.div>
  );
}
