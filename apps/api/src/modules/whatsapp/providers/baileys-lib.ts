// Baileys 7 se publica SOLO como ESM (`"type": "module"`), y la API compila a CommonJS: un
// `import ... from "@whiskeysockets/baileys"` estático se convertiría en `require()`, que falla con un
// paquete ESM en Node < 22. Por eso se carga con `import()` dinámico, una sola vez por proceso, y el
// resto del código usa los tipos con `resolution-mode: "import"`.
export type BaileysLib = typeof import("@whiskeysockets/baileys", { with: { "resolution-mode": "import" } });

let cargando: Promise<BaileysLib> | null = null;

export function cargarBaileys(): Promise<BaileysLib> {
  if (!cargando) cargando = import("@whiskeysockets/baileys") as Promise<BaileysLib>;
  return cargando;
}
