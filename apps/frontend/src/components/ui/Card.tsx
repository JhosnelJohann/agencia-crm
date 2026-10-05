import { cn } from "@/lib/utils";

/**
 * Tarjeta plana (superficie #161310, borde fino, sin sombra) — el primitivo base del rediseño 2026. Distinta de `GlassCard`
 * (translúcida, se mantiene para donde se quiera ese efecto explícitamente).
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl2 bg-bg-darkcard border border-line transition-all duration-300 ease-landing hover:border-brand-primary/25",
        className
      )}
      {...props}
    />
  );
}
