"use client";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowDown, CaretDown, Tag as TagIcon, Check, Plus, Eye, AlertCircle, MapPin, UserPlus, UserCircle, Paperclip, Ban } from "@/lib/bootstrap-icons";
import { MessageStatus, type Status } from "@/components/chat/MessageStatus";
import { FileMessage } from "@/components/chat/FileMessage";
import { AudioMessage } from "@/components/chat/AudioMessage";
import { FilePreviewModal } from "@/components/drive/DriveBrowser";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { useFileDrop } from "@/lib/useFileDrop";
import { archivosDeLaConversacion, posicionDeArchivo, vecinoDeArchivo } from "@/lib/chat-archivos";
import { ConversationComposer, type EnvioWhatsApp } from "./ConversationComposer";
import { WhatsAppAvatar } from "./WhatsAppAvatar";
import { AsignadoPicker, type UsuarioAsignable } from "./AsignadoPicker";
import { formatearNumeroWhatsApp, nombreConversacion } from "@/lib/whatsapp-numero";
import type { WhatsAppConversacionDetalle, WhatsAppMensaje, WhatsAppPipelineStage, WhatsAppTag } from "./types";

/** Colores predefinidos para crear un tag sin salir del chat — los mismos tonos que ya usa el
 * pipeline en otras partes del CRM, para que un tag nuevo no desentone. */
const COLORES_TAG = ["#e8581a", "#16b91a", "#e30b0b", "#5d8fa8", "#f0b040", "#b8460f", "#c96a3d"];

function estadoToStatus(e: WhatsAppMensaje["estado_entrega"]): Status {
  if (e === "leido") return "read";
  if (e === "entregado" || e === "enviado") return "delivered";
  if (e === "pendiente") return "pending";
  if (e === "fallido") return "failed";
  return "sent";
}

const fmtHora = (iso: string) => new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

/** "Hoy", "Ayer", día de la semana (última semana) o fecha — como los separadores de WhatsApp. */
function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const inicio = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((inicio(hoy) - inicio(d)) / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return d.toLocaleDateString("es", { weekday: "long" });
  return d.toLocaleDateString("es", { day: "numeric", month: "long", year: d.getFullYear() === hoy.getFullYear() ? undefined : "numeric" });
}

function numeroConBandera(jid: string): string {
  const { texto, bandera } = formatearNumeroWhatsApp(jid);
  return bandera ? `${bandera} ${texto}` : texto;
}

/** Formato de WhatsApp (*negrita*, _cursiva_, ~tachado~, ```monoespaciado```) y enlaces clicables. */
function TextoWhatsApp({ texto }: { texto: string }) {
  const partes = useMemo(() => {
    const re = /(https?:\/\/[^\s<]+|www\.[^\s<]+|```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
    const out: { t: string; k: "txt" | "url" | "b" | "i" | "s" | "code" }[] = [];
    let ultimo = 0;
    for (const m of texto.matchAll(re)) {
      const i = m.index ?? 0;
      if (i > ultimo) out.push({ t: texto.slice(ultimo, i), k: "txt" });
      const v = m[0];
      if (/^(https?:\/\/|www\.)/.test(v)) out.push({ t: v, k: "url" });
      else if (v.startsWith("```")) out.push({ t: v.slice(3, -3), k: "code" });
      else out.push({ t: v.slice(1, -1), k: v[0] === "*" ? "b" : v[0] === "_" ? "i" : "s" });
      ultimo = i + v.length;
    }
    if (ultimo < texto.length) out.push({ t: texto.slice(ultimo), k: "txt" });
    return out;
  }, [texto]);
  return (
    <>
      {partes.map((p, i) =>
        p.k === "url" ? <a key={i} href={p.t.startsWith("www.") ? `https://${p.t}` : p.t} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all hover:opacity-80">{p.t}</a>
        : p.k === "b" ? <strong key={i}>{p.t}</strong>
        : p.k === "i" ? <em key={i}>{p.t}</em>
        : p.k === "s" ? <s key={i}>{p.t}</s>
        : p.k === "code" ? <code key={i} className="font-mono text-[12.5px] bg-black/20 rounded px-1">{p.t}</code>
        : <Fragment key={i}>{p.t}</Fragment>
      )}
    </>
  );
}

interface BubbleProps {
  m: WhatsAppMensaje;
  onRetry?: (m: WhatsAppMensaje) => void;
  onAbrirImagen: (m: WhatsAppMensaje) => void;
  onAbrirArchivo: (m: WhatsAppMensaje) => void;
  onAgregarTarjeta?: (nombre: string, telefono: string) => void;
}

function Bubble({ m, onRetry, onAbrirImagen, onAbrirArchivo, onAgregarTarjeta }: BubbleProps) {
  const isMe = m.direccion === "saliente";
  const fallido = m.estado_entrega === "fallido";
  const borrado = !!m.borrado_at;
  const sinFondo = m.tipo === "sticker" && !borrado;
  const reacciones = [m.reaccion, m.reaccion_propia].filter(Boolean) as string[];

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start", reacciones.length && "mb-3")}>
      <div
        className={cn(
          "relative max-w-[78%] sm:max-w-[65%]",
          sinFondo ? "" : "rounded-2xl px-3 py-2 shadow-sm",
          !sinFondo && (isMe
            ? fallido
              ? "bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-br-sm"
              : "gradient-orange text-white rounded-br-sm shadow-md"
            : "glass-light rounded-bl-sm")
        )}
      >
        {borrado ? (
          <div className="text-sm italic opacity-75 flex items-center gap-1.5"><Ban className="h-3.5 w-3.5" /> Se eliminó este mensaje</div>
        ) : (
          <>
            {m.tipo === "texto" && <div className="text-sm whitespace-pre-wrap break-words"><TextoWhatsApp texto={m.contenido || ""} /></div>}

            {m.tipo === "imagen" && m.archivo_url && (
              <button type="button" onClick={() => onAbrirImagen(m)} className="block -mx-1 -mt-0.5 rounded-xl overflow-hidden" aria-label="Ver imagen">
                <img src={m.archivo_url} alt="" loading="lazy" className="max-w-[280px] max-h-[340px] w-full object-cover hover:brightness-95 transition" />
              </button>
            )}
            {m.tipo === "video" && m.archivo_url && (
              <video src={m.archivo_url} controls preload="metadata" className="rounded-xl max-w-[280px] max-h-[340px] -mx-1 -mt-0.5" />
            )}
            {m.tipo === "audio" && m.archivo_url && (
              <div className="flex items-center gap-2">
                {m.es_nota_voz && <span title="Nota de voz" className="text-base leading-none">🎤</span>}
                <AudioMessage url={m.archivo_url} filename={m.archivo_nombre} mime={m.archivo_tipo} isMe={isMe} />
              </div>
            )}
            {m.tipo === "archivo" && m.archivo_url && (
              <FileMessage url={m.archivo_url} filename={m.archivo_nombre} mime={m.archivo_tipo} size={m.archivo_tamanio} isMe={isMe} onVer={() => onAbrirArchivo(m)} />
            )}
            {m.tipo === "sticker" && m.archivo_url && (
              <img src={m.archivo_url} alt="Sticker" loading="lazy" className="h-36 w-36 object-contain drop-shadow" />
            )}
            {m.tipo === "ubicacion" && m.datos && (
              <a href={`https://www.google.com/maps?q=${m.datos.lat},${m.datos.lng}`} target="_blank" rel="noopener noreferrer"
                className={cn("flex items-center gap-3 rounded-xl p-2.5 min-w-[220px] transition", isMe ? "bg-white/15 hover:bg-white/25" : "bg-black/[0.05] hover:bg-black/[0.08]")}>
                <span className="h-10 w-10 rounded-xl bg-[#e11d48]/15 text-[#e11d48] flex items-center justify-center shrink-0"><MapPin className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{m.datos.nombre || (m.datos.enVivo ? "Ubicación en tiempo real" : "Ubicación")}</span>
                  <span className="block text-[11px] opacity-75 truncate">{m.datos.direccion || `${Number(m.datos.lat).toFixed(5)}, ${Number(m.datos.lng).toFixed(5)}`} · Abrir en Maps</span>
                </span>
              </a>
            )}
            {m.tipo === "contacto" && m.datos && (
              <div className={cn("rounded-xl p-2.5 min-w-[220px]", isMe ? "bg-white/15" : "bg-black/[0.05]")}>
                <div className="flex items-center gap-2.5">
                  <span className="h-10 w-10 rounded-full bg-slate-400/25 flex items-center justify-center shrink-0"><UserCircle className="h-6 w-6 opacity-80" /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{m.datos.nombre || "Contacto"}</span>
                    {m.datos.telefono && <span className="block text-[11px] opacity-75">{m.datos.telefono}</span>}
                  </span>
                </div>
                {m.datos.telefono && onAgregarTarjeta && (
                  <button type="button" onClick={() => onAgregarTarjeta(m.datos!.nombre || "Contacto de WhatsApp", m.datos!.telefono)}
                    className={cn("mt-2 w-full h-8 rounded-lg text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition",
                      isMe ? "bg-white/20 hover:bg-white/30" : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15")}>
                    <UserPlus className="h-3.5 w-3.5" /> Agregar a contactos
                  </button>
                )}
              </div>
            )}
            {m.tipo === "sistema" && <div className="text-xs italic opacity-70">Mensaje no compatible — ábrelo en el teléfono</div>}

            {/* Pie de foto / comentario de imagen, vídeo o documento */}
            {(m.tipo === "imagen" || m.tipo === "video" || m.tipo === "archivo") && m.contenido && (
              <div className="text-sm whitespace-pre-wrap break-words mt-1.5"><TextoWhatsApp texto={m.contenido} /></div>
            )}
          </>
        )}

        <div className={cn("flex items-center gap-1 justify-end mt-1 text-[10px]",
          sinFondo ? "text-ink-sub" : isMe ? (fallido ? "text-red-600 dark:text-red-400" : "text-white/75") : "text-ink-sub")}>
          {m.editado_at && !borrado && <span className="italic">editado ·</span>}
          {!fallido && fmtHora(m.created_at)}
          {isMe && !fallido && <MessageStatus status={estadoToStatus(m.estado_entrega)} />}
          {isMe && fallido && (
            <button type="button" onClick={() => onRetry?.(m)} title="No se pudo enviar — reintentar"
              className="inline-flex items-center gap-1 font-ui font-bold uppercase tracking-wider hover:underline">
              <AlertCircle className="h-3 w-3" /> No enviado · Reintentar
            </button>
          )}
          {/* "Visto por el equipo" — distinto del check de envío: alguien del equipo ya vio esto en el CRM. */}
          {!isMe && m.visto_at && <span title="Visto por el equipo" className="inline-flex"><Eye className="h-3 w-3 text-ink-sub" /></span>}
        </div>

        {reacciones.length > 0 && (
          <div className={cn("absolute -bottom-3.5 flex gap-0.5 rounded-full bg-[#1e293b] border border-white/10 px-1.5 py-0.5 text-[13px] leading-none shadow", isMe ? "right-2" : "left-2")}>
            {reacciones.map((r, i) => <span key={i}>{r}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function StagePicker({ etapas, valor, onChange }: { etapas: WhatsAppPipelineStage[]; valor: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const actual = etapas.find((e) => e.id === valor);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title={actual?.label || "Elegir etapa"}
        className="h-8 px-2 sm:px-2.5 rounded-lg text-[13px] font-ui font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
        style={{ backgroundColor: actual ? `${actual.color}1a` : undefined, color: actual?.color }}
      >
        {/* Móvil: solo el punto de color; desde `sm` se ve la etiqueta completa. */}
        {actual ? <span className="h-2 w-2 rounded-full shrink-0 sm:hidden" style={{ backgroundColor: actual.color }} /> : null}
        <span className="hidden sm:inline">{actual?.label || "Etapa"}</span>
        <CaretDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 w-52 max-w-[calc(100vw-2rem)] rounded-xl glass-panel py-1 overflow-hidden">
            {etapas.map((e) => (
              <button key={e.id} onClick={() => { onChange(e.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <span className="flex-1">{e.label}</span>
                {e.id === valor && <Check className="h-3.5 w-3.5 text-brand-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TagPicker({ todas, activas, onToggle, onCrear }: {
  todas: WhatsAppTag[]; activas: WhatsAppTag[]; onToggle: (t: WhatsAppTag) => void;
  onCrear: (nombre: string, color: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [colorNuevo, setColorNuevo] = useState(COLORES_TAG[0]);
  const [guardando, setGuardando] = useState(false);

  const confirmarCrear = async () => {
    if (nombreNuevo.trim().length < 1 || guardando) return;
    setGuardando(true);
    try {
      await onCrear(nombreNuevo.trim(), colorNuevo);
      setNombreNuevo("");
      setCreando(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen((v) => !v)} title="Etiquetas" aria-label="Etiquetas" className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition text-ink-sub relative">
        <TagIcon className="h-4 w-4" />
        {activas.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] px-0.5 rounded-full bg-brand-primary text-white text-[8px] font-bold flex items-center justify-center">{activas.length}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreando(false); }} />
          <div className="absolute right-0 mt-1 z-20 w-56 max-w-[calc(100vw-2rem)] rounded-xl glass-panel py-1 overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              {todas.length === 0 && !creando && <div className="px-3 py-2 text-[11px] text-ink-sub">Sin tags creados aún</div>}
              {todas.map((t) => {
                const on = activas.some((a) => a.id === t.id);
                return (
                  <button key={t.id} onClick={() => onToggle(t)} className="w-full text-left px-3 py-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 transition">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="flex-1 truncate">{t.nombre}</span>
                    {on && <Check className="h-3.5 w-3.5 text-brand-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-black/5 dark:border-white/10 mt-1 pt-1 px-2 pb-2">
              {creando ? (
                <div className="space-y-2 pt-1">
                  <input autoFocus value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmarCrear()}
                    placeholder="Nombre de la etiqueta"
                    className="w-full h-8 px-2.5 rounded-lg bg-bg-surface-2 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/40" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLORES_TAG.map((c) => (
                      <button key={c} onClick={() => setColorNuevo(c)} style={{ backgroundColor: c }} aria-label={`Color ${c}`}
                        className={cn("h-5 w-5 rounded-full transition", colorNuevo === c && "ring-2 ring-offset-2 ring-black/30 dark:ring-offset-neutral-900")} />
                    ))}
                  </div>
                  <button onClick={confirmarCrear} disabled={guardando || nombreNuevo.trim().length < 1}
                    className="w-full h-8 rounded-lg bg-brand-primary text-white text-xs font-semibold disabled:opacity-40 transition">
                    {guardando ? "Creando…" : "Crear etiqueta"}
                  </button>
                </div>
              ) : (
                <button onClick={() => setCreando(true)} className="w-full flex items-center gap-2 px-1 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/8 rounded-lg transition">
                  <Plus className="h-3.5 w-3.5" /> Nueva etiqueta
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  conversacion: WhatsAppConversacionDetalle;
  mensajes: WhatsAppMensaje[] | null;
  etapas: WhatsAppPipelineStage[];
  tags: WhatsAppTag[];
  usuarios: UsuarioAsignable[];
  conectado: boolean;
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onBack?: () => void;
  onSend: (d: EnvioWhatsApp) => Promise<void>;
  onRetry?: (m: WhatsAppMensaje) => void;
  onCambiarEtapa: (etapaId: string) => void;
  onAsignar: (userId: string | null) => void;
  onToggleTag: (tag: WhatsAppTag) => void;
  onCrearTag: (nombre: string, color: string) => Promise<void>;
  onAbrirPerfil: () => void;
  /** "Agregar a contactos" (abre crear/vincular prellenado) — solo si aún no está vinculado. */
  onAgregarContacto?: () => void;
  /** Tarjeta de contacto (vCard) recibida → crear ese contacto en el CRM. */
  onAgregarTarjeta?: (nombre: string, telefono: string) => void;
}

export function ConversationThread({
  conversacion, mensajes, etapas, tags, usuarios, conectado, hasMore = false, loadingOlder = false, onLoadOlder,
  onBack, onSend, onRetry, onCambiarEtapa, onAsignar, onToggleTag, onCrearTag, onAbrirPerfil, onAgregarContacto, onAgregarTarjeta,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Ancla de scroll para el historial anterior (evita el "salto" al prepender mensajes viejos).
  const anchorHeightRef = useRef(0);
  const anchorTopRef = useRef(0);
  const prevConversacionIdRef = useRef<string | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);
  const prevLastIdRef = useRef<string | null>(null);
  const prevLenRef = useRef(0);
  const [lejosDelFondo, setLejosDelFondo] = useState(false);
  const [indiceImagen, setIndiceImagen] = useState<number | null>(null);
  const [archivoAbiertoId, setArchivoAbiertoId] = useState<string | null>(null);
  const [fotoPerfilAbierta, setFotoPerfilAbierta] = useState(false);
  const [soltados, setSoltados] = useState<File[]>([]);

  // Arrastrar archivos sobre CUALQUIER parte de la conversación (como WhatsApp Web).
  const { isOver, dropProps } = useFileDrop((files) => setSoltados(files), { disabled: !conectado });

  const imagenes = useMemo(
    () => (mensajes || []).filter((m) => m.tipo === "imagen" && m.archivo_url && !m.borrado_at)
      .map((m) => ({ id: m.id, url: m.archivo_url!, nombre: m.archivo_nombre, pie: m.contenido })),
    [mensajes]
  );
  const archivos = useMemo(() => archivosDeLaConversacion((mensajes || []).filter((m) => !m.borrado_at)), [mensajes]);
  const archivoAbierto = archivoAbiertoId ? archivos.find((a) => a.id === archivoAbiertoId) : null;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setLejosDelFondo(el.scrollHeight - el.scrollTop - el.clientHeight > 400);
    // Cerca del tope → historial anterior.
    if (el.scrollTop <= 120 && hasMore && !loadingOlder && onLoadOlder) {
      anchorHeightRef.current = el.scrollHeight;
      anchorTopRef.current = el.scrollTop;
      onLoadOlder();
    }
  };

  // Al cambiar de chat baja al fondo; con un mensaje nuevo baja solo si ya se estaba cerca del
  // fondo (o es un mensaje propio); en scroll-up (prepend de historial) preserva la posición.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !mensajes) return;
    const firstId = mensajes[0]?.id ?? null;
    const lastId = mensajes[mensajes.length - 1]?.id ?? null;
    const conversacionCambio = conversacion.id !== prevConversacionIdRef.current;
    const esPrepend =
      !conversacionCambio && !!prevFirstIdRef.current && firstId !== prevFirstIdRef.current &&
      mensajes.length > prevLenRef.current && mensajes.some((m) => m.id === prevFirstIdRef.current);

    if (conversacionCambio) {
      el.scrollTop = el.scrollHeight;
    } else if (esPrepend) {
      el.scrollTop = el.scrollHeight - anchorHeightRef.current + anchorTopRef.current;
    } else if (lastId && lastId !== prevLastIdRef.current) {
      const cercaDelFondo = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      const ultimoEsMio = mensajes[mensajes.length - 1]?.direccion === "saliente";
      if (cercaDelFondo || ultimoEsMio) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    prevFirstIdRef.current = firstId;
    prevLastIdRef.current = lastId;
    prevLenRef.current = mensajes.length;
    prevConversacionIdRef.current = conversacion.id;
  }, [mensajes, conversacion.id]);

  const numero = conversacion.telefono_real || conversacion.wa_jid;
  const tieneNumeroReal = !!formatearNumeroWhatsApp(numero).bandera || numero.endsWith("@s.whatsapp.net");

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full relative" {...dropProps}>
      {isOver && (
        <div className="absolute inset-0 z-[60] m-2 rounded-2xl border-2 border-dashed border-brand-primary bg-brand-primary/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-brand-primary font-ui font-bold"><Paperclip className="h-5 w-5" /> Suelta para enviar a {nombreConversacion(conversacion)}</div>
        </div>
      )}

      <div className="relative z-20 shrink-0 flex items-center gap-2.5 px-4 py-3 border-b border-black/5 dark:border-white/10 glass-topbar">
        {onBack && (
          <button onClick={onBack} aria-label="Volver" className="lg:hidden h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => (conversacion.foto_perfil_url ? setFotoPerfilAbierta(true) : onAbrirPerfil())}
          aria-label="Ver foto de perfil" className="shrink-0 rounded-full hover:ring-2 hover:ring-brand-primary/40 transition">
          <WhatsAppAvatar fotoUrl={conversacion.foto_perfil_url} nombre={nombreConversacion(conversacion)} size={38} />
        </button>
        <button onClick={onAbrirPerfil} className="flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5 transition" title="Ver perfil">
          <div className="text-sm font-bold truncate">{nombreConversacion(conversacion)}</div>
          <div className="text-[11px] text-ink-sub truncate">
            {numeroConBandera(numero)}{conversacion.info_perfil ? ` · ${conversacion.info_perfil}` : ""}
          </div>
        </button>
        {!conversacion.contacto_id && onAgregarContacto && (
          <button type="button" onClick={onAgregarContacto} title={tieneNumeroReal ? "Agregar a contactos del CRM" : "Agregar a contactos (WhatsApp no comparte el número de este contacto)"}
            className="hidden sm:inline-flex h-8 px-2.5 rounded-lg bg-brand-primary/15 text-brand-primary text-[12px] font-bold items-center gap-1.5 hover:bg-brand-primary/25 transition shrink-0">
            <UserPlus className="h-3.5 w-3.5" /> Agregar a contactos
          </button>
        )}
        {conversacion.contacto_id && (
          <a href={`/contactos/${conversacion.contacto_id}`} title="Ver contacto en el CRM"
            className="hidden sm:inline-flex h-8 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-ink-sub text-[12px] font-bold items-center gap-1.5 transition shrink-0">
            <UserCircle className="h-4 w-4" /> Ver contacto
          </a>
        )}
        <AsignadoPicker usuarios={usuarios} valor={conversacion.asignado_a} onChange={onAsignar} />
        <TagPicker todas={tags} activas={conversacion.tags} onToggle={onToggleTag} onCrear={onCrearTag} />
        <StagePicker etapas={etapas} valor={conversacion.etapa_id} onChange={onCambiarEtapa} />
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 chat-bg" data-lenis-prevent>
        {loadingOlder && (
          <div className="flex justify-center py-1"><div className="h-4 w-4 rounded-full border-2 border-white/15 border-t-brand-primary animate-spin" /></div>
        )}
        {mensajes === null ? (
          <div className="h-full flex items-center justify-center text-xs text-ink-sub">Cargando…</div>
        ) : mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-ink-sub">Todavía no hay mensajes en esta conversación</div>
        ) : (
          mensajes.map((m, i) => {
            const dia = etiquetaDia(m.created_at);
            const nuevoDia = i === 0 || etiquetaDia(mensajes[i - 1].created_at) !== dia;
            return (
              <Fragment key={m.id}>
                {nuevoDia && (
                  <div className="flex justify-center py-1.5">
                    <span className="rounded-lg bg-[#1e293b]/90 border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200 capitalize shadow-sm">{dia}</span>
                  </div>
                )}
                <Bubble m={m} onRetry={onRetry}
                  onAbrirImagen={(x) => setIndiceImagen(Math.max(0, imagenes.findIndex((im) => im.id === x.id)))}
                  onAbrirArchivo={(x) => setArchivoAbiertoId(x.id)}
                  onAgregarTarjeta={onAgregarTarjeta} />
              </Fragment>
            );
          })
        )}
      </div>

      {lejosDelFondo && (
        <button type="button" aria-label="Ir al último mensaje"
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
          className="absolute right-5 bottom-24 z-30 h-10 w-10 rounded-full bg-[#1e293b] border border-white/10 text-slate-100 shadow-lg flex items-center justify-center hover:bg-[#334155] transition">
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <ConversationComposer onSend={onSend} disabled={!conectado} externalFiles={soltados} onExternalConsumed={() => setSoltados([])} />

      <ImageLightbox imagenes={imagenes} indice={indiceImagen} onIndice={setIndiceImagen} onClose={() => setIndiceImagen(null)} />
      <ImageLightbox
        imagenes={conversacion.foto_perfil_url ? [{ id: "perfil", url: conversacion.foto_perfil_url, nombre: nombreConversacion(conversacion), pie: conversacion.info_perfil }] : []}
        indice={fotoPerfilAbierta && conversacion.foto_perfil_url ? 0 : null}
        onIndice={() => {}}
        onClose={() => setFotoPerfilAbierta(false)}
      />
      {archivoAbierto && (
        <FilePreviewModal
          file={{ url: archivoAbierto.archivo_url, nombre: archivoAbierto.archivo_nombre || "archivo", mime: archivoAbierto.archivo_tipo || null, size_bytes: archivoAbierto.archivo_tamanio ?? null }}
          onClose={() => setArchivoAbiertoId(null)}
          onPrev={() => { const id = vecinoDeArchivo(archivos, archivoAbiertoId, -1); if (id) setArchivoAbiertoId(id); }}
          onNext={() => { const id = vecinoDeArchivo(archivos, archivoAbiertoId, +1); if (id) setArchivoAbiertoId(id); }}
          posicion={posicionDeArchivo(archivos, archivoAbiertoId) ?? undefined}
        />
      )}
    </div>
  );
}
