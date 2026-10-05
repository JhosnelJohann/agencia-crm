"use client";
import { useEffect, useState } from "react";

const KEY = "agencia-fx"; // "on" | "off"

/** ¿Este equipo aguanta WebGL + blur? Heurística conservadora; el usuario puede forzarlo. */
export function fxDefault(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (softwareGL()) return false;
  const cores = (navigator as any).hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || 8;
  return cores >= 4 && mem >= 4;
}

/** WebGL por software (SwiftShader / llvmpipe / Basic Render): blur y 3D irían a tirones. */
let softwareCache: boolean | null = null;
function softwareGL(): boolean {
  if (softwareCache !== null) return softwareCache;
  softwareCache = false;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return (softwareCache = true);
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (softwareCache = /swiftshader|llvmpipe|software|basic render/i.test(name));
  } catch {
    return false;
  }
}

/** Bandera de QA: `?fx=on` / `?fx=off` en la URL fuerza (y recuerda) el estado de los efectos. */
function applyQueryFlag() {
  try {
    const v = new URLSearchParams(window.location.search).get("fx");
    if (v === "on" || v === "off") localStorage.setItem(KEY, v);
  } catch {}
}

export function readFx(): boolean {
  applyQueryFlag();
  try {
    const v = localStorage.getItem(KEY);
    if (v === "on") return true;
    if (v === "off") return false;
  } catch {}
  return fxDefault();
}

/** Estado global de efectos (escena 3D, partículas, tilt). Se sincroniza entre componentes. */
export function useFx(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const apply = () => { const v = readFx(); setOn(v); document.documentElement.classList.toggle("fx-off", !v); };
    apply();
    const h = apply;
    window.addEventListener("agencia-fx", h);
    return () => window.removeEventListener("agencia-fx", h);
  }, []);
  const set = (v: boolean) => {
    try { localStorage.setItem(KEY, v ? "on" : "off"); } catch {}
    document.documentElement.classList.toggle("fx-off", !v);
    window.dispatchEvent(new Event("agencia-fx"));
  };
  return [on, set];
}

/**
 * Guardián de rendimiento: mide los cuadros por segundo durante los primeros ~2 s en que la
 * pestaña está VISIBLE. Si el equipo no da al menos ~28 fps, apaga los efectos por su cuenta
 * (el usuario puede volver a activarlos desde la barra). Así el diseño nunca degrada la app.
 */
export function useFpsGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (localStorage.getItem(KEY)) return; } catch {} // el usuario ya eligió: se respeta
    let raf = 0, frames = 0, start = 0, done = false;
    const tick = (t: number) => {
      if (done) return;
      if (document.hidden) { start = 0; frames = 0; raf = requestAnimationFrame(tick); return; }
      if (!start) start = t;
      frames++;
      const el = t - start;
      if (el >= 2200) {
        done = true;
        const fps = (frames * 1000) / el;
        if (fps < 28) {
          document.documentElement.classList.add("fx-off");
          try { localStorage.setItem(KEY, "off"); } catch {}
          window.dispatchEvent(new Event("agencia-fx"));
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    // Espera a que termine la hidratación inicial antes de medir.
    const t0 = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1800);
    return () => { done = true; clearTimeout(t0); cancelAnimationFrame(raf); };
  }, []);
}
