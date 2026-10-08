"use client";
import { AppIcon, type AppIconName } from "./AppIcon";
import { BrandLogo, type BrandName } from "./BrandLogo";

/** Icono de un módulo: 2D del CRM o logo oficial de la plataforma que maneja (WhatsApp, Meta…). */
export type NavIconRef = AppIconName | { brand: BrandName };

export function NavIcon({ icon, size = 28, active = false, className }: { icon: NavIconRef; size?: number; active?: boolean; className?: string }) {
  return typeof icon === "string"
    ? <AppIcon name={icon} size={size} active={active} className={className} />
    : <BrandLogo brand={icon.brand} size={size} active={active} className={className} />;
}
