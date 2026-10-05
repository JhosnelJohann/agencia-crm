"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BRAND = "GOZZ";

// Etiqueta de cada sección (coincide con el Sidebar)
const SECTIONS: Record<string, string> = {
  dashboard: "Dashboard",
  contactos: "Contactos",
  oportunidades: "Oportunidades",
  tareas: "Tareas",
  tramites: "Servicios",
  drive: "Drive",
  chat: "Chat",
  correo: "Correo",
  reportes: "Reportes",
  embudos: "Embudos",
  campanas: "Campañas",
  anuncios: "Anuncios",
  scoring: "Scoring",
  redes: "Redes",
  f: "Formulario",
  equipo: "Equipo",
  asistencia: "Asistencia",
  configuracion: "Configuración",
  puntajes: "Puntajes",
  videollamada: "Videollamada",
  login: "Iniciar sesión",
};

// Forma singular para páginas de detalle (cuando hay /<seccion>/<id>)
const DETAIL: Record<string, string> = {
  oportunidades: "Oportunidad",
  contactos: "Contacto",
  tareas: "Tarea",
  tramites: "Servicio",
};

function titleFor(pathname: string): string {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return BRAND;
  const section = segs[0];
  const isDetail = segs.length > 1 && !!segs[1];
  const label = (isDetail && DETAIL[section]) || SECTIONS[section];
  return label ? `${label} · ${BRAND}` : BRAND;
}

/** Actualiza el título de la pestaña del navegador según la sección activa. */
export function PageTitle() {
  const pathname = usePathname();
  useEffect(() => {
    document.title = titleFor(pathname || "/");
  }, [pathname]);
  return null;
}
