"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, Send, Smile, X } from "@/lib/bootstrap-icons";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { AttachMenu, type AttachKind } from "@/components/chat/AttachMenu";
import { ChatAudioRecorder } from "@/components/chat/AudioRecorder";
import { cn } from "@/lib/utils";

export interface EnvioWhatsApp {
  tipo: string;
  contenido?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  archivoTamanio?: number;
  archivoTipo?: string;
  esNotaVoz?: boolean;
  duracionSeg?: number;
}

interface Props {
  onSend: (d: EnvioWhatsApp) => Promise<void>;
  disabled?: boolean;
  /** Archivos soltados sobre la conversación (el arrastre se detecta en todo el hilo, no solo aquí). */
  externalFiles?: File[];
  onExternalConsumed?: () => void;
}

const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const tipoDe = (mime: string) =>
  mime.startsWith("image/") ? "imagen" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "archivo";

async function subir(file: File): Promise<{ url: string; mimetype: string; size: number }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/whatsapp/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "No se pudo subir el archivo");
  return { url: d.url, mimetype: d.mimetype || file.type || "application/octet-stream", size: d.size ?? file.size };
}

/**
 * Compositor tipo WhatsApp Web: texto que crece, emoji en el cursor, adjuntar varios (imagen/vídeo/
 * documento), pegar con Ctrl+V, soltar archivos, vista previa con pie de foto antes de enviar y nota de
 * voz (el micrófono aparece cuando no hay texto; el backend la convierte a OGG/Opus y la manda como
 * nota de voz, no como archivo).
 */
export function ConversationComposer({ onSend, disabled, externalFiles, onExternalConsumed }: Props) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendientes, setPendientes] = useState<{ file: File; caption: string }[]>([]);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [montado, setMontado] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMontado(true), []);

  // Archivos soltados sobre el hilo → a la vista previa.
  useEffect(() => {
    if (externalFiles?.length) {
      setPendientes((p) => [...p, ...externalFiles.map((file) => ({ file, caption: "" }))]);
      onExternalConsumed?.();
    }
  }, [externalFiles, onExternalConsumed]);

  // Textarea que crece con el contenido (hasta ~6 líneas).
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [texto]);

  const previews = useMemo(
    () => pendientes.map((p) => ({ ...p, url: /^(image|video)\//.test(p.file.type) ? URL.createObjectURL(p.file) : null })),
    [pendientes]
  );
  useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews]);

  const enviarTexto = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    setTexto("");
    try {
      await onSend({ tipo: "texto", contenido });
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el mensaje");
      setTexto(contenido);
    } finally {
      setEnviando(false);
      taRef.current?.focus();
    }
  };

  const insertarEmoji = (emo: string) => {
    const ta = taRef.current;
    if (!ta) { setTexto((t) => t + emo); return; }
    const s = ta.selectionStart ?? texto.length;
    const e = ta.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, s) + emo + texto.slice(e));
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + emo.length, s + emo.length); });
  };

  const agregar = (files: File[]) => {
    if (files.length) setPendientes((p) => [...p, ...files.map((file) => ({ file, caption: "" }))]);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (!files.length) return; // texto normal: lo pega el navegador
    e.preventDefault();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    agregar(files.map((f) => (f.name && f.name !== "image.png" ? f
      : new File([f], `captura-${stamp}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type }))));
  };

  const elegir = (kind: AttachKind) => (kind === "image" ? imageRef : kind === "video" ? videoRef : fileRef).current?.click();
  const onElegidos = (e: React.ChangeEvent<HTMLInputElement>) => {
    agregar(e.target.files ? Array.from(e.target.files) : []);
    e.target.value = "";
  };

  const confirmarEnvio = async () => {
    if (!pendientes.length || progreso) return;
    const lista = pendientes;
    setProgreso({ hecho: 0, total: lista.length });
    try {
      for (let i = 0; i < lista.length; i++) {
        const { file, caption } = lista[i];
        const up = await subir(file);
        await onSend({
          tipo: tipoDe(up.mimetype), contenido: caption.trim() || undefined,
          archivoUrl: up.url, archivoNombre: file.name, archivoTamanio: up.size, archivoTipo: up.mimetype,
        });
        setProgreso({ hecho: i + 1, total: lista.length });
      }
      setPendientes([]);
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar el archivo");
    } finally {
      setProgreso(null);
    }
  };

  const enviarNotaDeVoz = async (file: File, durationMs: number) => {
    try {
      const up = await subir(file);
      await onSend({
        tipo: "audio", esNotaVoz: true, duracionSeg: Math.max(1, Math.round(durationMs / 1000)),
        archivoUrl: up.url, archivoNombre: file.name, archivoTamanio: up.size, archivoTipo: up.mimetype,
      });
    } catch (e: any) {
      toast.error(e?.message || "No se pudo enviar la nota de voz");
    }
  };

  const hayTexto = !!texto.trim();

  return (
    <div className="shrink-0 border-t border-black/5 dark:border-white/10 p-3 flex items-end gap-2 backdrop-blur-md bg-white/70 dark:bg-white/[0.03] relative">
      <input ref={fileRef} type="file" multiple hidden onChange={onElegidos} />
      <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={onElegidos} />
      <input ref={videoRef} type="file" accept="video/*" multiple hidden onChange={onElegidos} />

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); }}
          disabled={disabled || !!progreso}
          title="Adjuntar (imágenes, vídeos o documentos; también puedes pegar o soltar archivos)"
          aria-label="Adjuntar"
          className="h-10 w-10 rounded-xl flex items-center justify-center text-ink-sub hover:text-brand-primary hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40"
        >
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        {attachOpen && <AttachMenu onPick={(k) => { setAttachOpen(false); elegir(k); }} onClose={() => setAttachOpen(false)} />}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false); }}
          disabled={disabled}
          title="Emoji"
          aria-label="Emoji"
          className="h-10 w-10 rounded-xl flex items-center justify-center text-ink-sub hover:text-brand-primary hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40"
        >
          <Smile className="h-[18px] w-[18px]" />
        </button>
        {emojiOpen && <EmojiPicker onPick={(e: string) => { insertarEmoji(e); setEmojiOpen(false); }} onClose={() => setEmojiOpen(false)} />}
      </div>

      <textarea
        ref={taRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarTexto(); } }}
        onPaste={onPaste}
        disabled={disabled}
        placeholder={disabled ? "Conecta el número para poder responder" : "Escribe un mensaje… (Ctrl+V para pegar imágenes o archivos)"}
        rows={1}
        data-lenis-prevent
        className="flex-1 min-h-[40px] max-h-40 resize-none py-2.5 px-4 rounded-xl bg-bg-surface-2 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 disabled:opacity-50"
      />

      {/* Micrófono cuando no hay texto (como WhatsApp); enviar cuando sí. */}
      <div className={cn("shrink-0", hayTexto || disabled ? "hidden" : "")}>
        <ChatAudioRecorder disabled={disabled} onSend={enviarNotaDeVoz} />
      </div>
      <button
        type="button"
        onClick={enviarTexto}
        disabled={disabled || enviando || !hayTexto}
        aria-label="Enviar"
        className={cn(
          "h-10 w-10 rounded-xl gradient-orange text-white flex items-center justify-center shrink-0 shadow-glow hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all",
          !hayTexto && !disabled && "hidden"
        )}
      >
        <Send className="h-4 w-4" />
      </button>

      {/* Vista previa antes de enviar (portal: se centra en la ventana, no en el panel). */}
      {montado && pendientes.length > 0 && createPortal(
        <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !progreso && setPendientes([])}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg modal-surface rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0"><Paperclip className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm text-white">Enviar {pendientes.length} {pendientes.length === 1 ? "archivo" : "archivos"}</div>
                <div className="text-[12px] text-slate-400">Añade un pie de foto si quieres · Enter envía</div>
              </div>
              <button type="button" onClick={() => setPendientes([])} disabled={!!progreso} aria-label="Cancelar" className="h-9 w-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-300 disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" data-lenis-prevent style={{ overscrollBehavior: "contain" }}>
              {previews.map((p, i) => (
                <div key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="h-20 w-20 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
                    {p.url && p.file.type.startsWith("image/") ? <img src={p.url} alt="" className="h-full w-full object-cover" />
                      : p.url ? <video src={p.url} className="h-full w-full object-cover" muted />
                      : <FileText className="h-8 w-8 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-white truncate flex-1">{p.file.name}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{fmtSize(p.file.size)}</span>
                      {!progreso && (
                        <button type="button" onClick={() => setPendientes((l) => l.filter((_, j) => j !== i))} aria-label="Quitar" className="h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      value={p.caption}
                      onChange={(e) => setPendientes((l) => l.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarEnvio(); } }}
                      placeholder="Añade un comentario…"
                      disabled={!!progreso}
                      autoFocus={i === 0}
                      className="h-9 rounded-lg bg-white/[0.06] border border-white/10 px-3 text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-brand-primary/50"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={!!progreso} className="h-10 px-3 rounded-xl text-[13px] font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50">
                + Añadir más
              </button>
              <button type="button" onClick={confirmarEnvio} disabled={!!progreso}
                className="h-10 px-5 rounded-xl gradient-orange text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60">
                {progreso ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando {progreso.hecho}/{progreso.total}</> : <><Send className="h-4 w-4" /> Enviar</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
