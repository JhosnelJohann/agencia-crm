"use client";
import { useEffect } from "react";

/**
 * La app es SOLO oscura (identidad de sandrogozz.com). Ya no hay tema claro ni toggle:
 * se fuerza la clase `dark` para que las variantes `dark:` de Tailwind sean las que mandan.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return <>{children}</>;
}
