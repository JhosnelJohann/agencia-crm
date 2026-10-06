"use client";
import { cn } from "@/lib/utils";

export function AuroraBackground({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className="absolute inset-[-50%] animate-[aurora-spin_44s_linear_infinite] [will-change:transform]"
        style={{
          background: "conic-gradient(from 0deg at 50% 50%, #e8581a, #e8581a, #c96a3d, #94a3b8, #16b91a, #e8581a)",
          filter: `blur(64px)`,
          opacity: 0.35 * intensity
        }}
      />
      <div
        className="absolute inset-[-50%] [will-change:transform]"
        style={{
          background: "conic-gradient(from 180deg at 50% 50%, #e8581a, #FFBE0B, #e8581a, #c96a3d, #94a3b8, #e8581a)",
          filter: `blur(84px)`,
          opacity: 0.2 * intensity,
          animation: "aurora-spin 60s linear infinite reverse"
        }}
      />
    </div>
  );
}
