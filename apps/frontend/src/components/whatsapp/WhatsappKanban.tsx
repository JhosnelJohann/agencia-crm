"use client";
import { HorizontalScrollArea } from "@/components/ui/HorizontalScrollArea";
import { nombreConversacion } from "@/lib/whatsapp-numero";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WhatsAppAvatar } from "./WhatsAppAvatar";
import type { ConversacionItem } from "./ConversationList";
import type { WhatsAppPipelineStage } from "./types";

interface Props {
  conexionId: string | null;
  etapas: WhatsAppPipelineStage[];
  onAbrirConversacion: (conversacionId: string) => void;
}

function TarjetaConversacion({ c, onOpen }: { c: ConversacionItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={onOpen}
      className={cn("rounded-xl glass-light p-2.5 cursor-grab active:cursor-grabbing transition", isDragging && "opacity-30")}
    >
      <div className="flex items-start gap-2">
        <WhatsAppAvatar fotoUrl={c.foto_perfil_url} nombre={nombreConversacion(c)} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <div className="text-[12.5px] font-bold truncate flex-1">{nombreConversacion(c)}</div>
            {c.no_leidos_count > 0 && (
              <span className="text-[9px] font-bold text-white bg-brand-green rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center tabular-nums shrink-0">
                {c.no_leidos_count > 99 ? "99+" : c.no_leidos_count}
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-sub truncate mt-0.5">
            {c.ultimo_mensaje_preview || <span className="italic">Sin mensajes</span>}
          </div>
          {(c.asignado_nombre || c.tags.length > 0) && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {c.asignado_nombre && (
                <span className="inline-flex items-center gap-1 text-[11px] font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-ink-sub">
                  <WhatsAppAvatar fotoUrl={c.asignado_foto_url} nombre={c.asignado_nombre} size={12} />
                  {c.asignado_nombre.split(" ")[0]}
                </span>
              )}
              {c.tags.map((t) => (
                <span key={t.id} className="text-[11px] font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${t.color}22`, color: t.color }}>
                  {t.nombre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnaEtapa({ etapa, items, onOpen }: { etapa: WhatsAppPipelineStage; items: ConversacionItem[]; onOpen: (id: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: etapa.id });
  return (
    <div
      className={cn(
        "rounded-2xl p-3 flex flex-col shrink-0 w-[280px] transition-all",
        isOver ? "ring-2 ring-brand-primary/40 bg-brand-primary/[0.04]" : "bg-black/[0.02] dark:bg-white/[0.02]"
      )}
      style={{ height: "calc(100vh - 220px)" }}
    >
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: etapa.color }} />
          <span className="font-ui text-[13px] font-bold uppercase tracking-[0.1em] text-ink-sub truncate">{etapa.label}</span>
        </div>
        <span className="font-ui text-[12px] font-bold text-ink-sub tabular-nums bg-white/40 dark:bg-white/5 rounded-full px-2 py-0.5 shrink-0">{items.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2 px-0.5 -mx-0.5">
        {items.map((c) => <TarjetaConversacion key={c.id} c={c} onOpen={() => onOpen(c.id)} />)}
        {items.length === 0 && <div className="text-[11px] text-ink-sub text-center py-8">Sin conversaciones</div>}
      </div>
    </div>
  );
}

/**
 * Vista de tablero por etapa — alternable con la Lista (no la reemplaza: la Lista sigue siendo la
 * vía rápida para contestar, el tablero es para ver el embudo completo de un vistazo). Trae TODAS
 * las conversaciones activas de la conexión de una sola vez (a diferencia del tablero de
 * Oportunidades, no pagina por columna — el volumen de una bandeja de WhatsApp es mucho menor que
 * el de todo el pipeline de ventas) y las agrupa en memoria por `etapa_id`.
 */
export function WhatsappKanban({ conexionId, etapas, onAbrirConversacion }: Props) {
  const [conversaciones, setConversaciones] = useState<ConversacionItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const cargar = async () => {
    if (!conexionId) { setConversaciones([]); return; }
    try {
      const r = await fetch(`/api/whatsapp/conexiones/${conexionId}/conversaciones`);
      if (!r.ok) return;
      const d = await r.json();
      setConversaciones(d.conversaciones || []);
    } catch { /* fallo transitorio: el usuario puede reintentar cambiando de vista */ }
  };

  useEffect(() => { setConversaciones(null); cargar(); }, [conexionId]);

  const columnas = useMemo(() => {
    const map: Record<string, ConversacionItem[]> = {};
    for (const e of etapas) map[e.id] = [];
    for (const c of conversaciones || []) if (c.etapa_id && map[c.etapa_id]) map[c.etapa_id].push(c);
    return map;
  }, [conversaciones, etapas]);

  const activa = (conversaciones || []).find((c) => c.id === activeId) || null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over || !conversaciones) return;
    const conversacionId = String(e.active.id);
    const etapaDestino = String(e.over.id);
    const conv = conversaciones.find((c) => c.id === conversacionId);
    if (!conv || conv.etapa_id === etapaDestino) return;

    const anterior = conv.etapa_id;
    setConversaciones((cur) => cur ? cur.map((c) => c.id === conversacionId ? { ...c, etapa_id: etapaDestino } : c) : cur);

    try {
      const r = await fetch(`/api/whatsapp/conversaciones/${conversacionId}/etapa`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etapa_id: etapaDestino }),
      });
      if (!r.ok) throw new Error();
    } catch {
      toast.error("No se pudo mover la conversación");
      setConversaciones((cur) => cur ? cur.map((c) => c.id === conversacionId ? { ...c, etapa_id: anterior } : c) : cur);
    }
  };

  if (conversaciones === null) {
    return <div className="flex-1 flex items-center justify-center text-sm text-ink-sub">Cargando tablero…</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <HorizontalScrollArea className="flex-1 overflow-y-hidden p-4 flex-1 min-h-0" outerClassName="flex-1 min-h-0 flex flex-col" tone="dark">
        <div className="flex gap-3 h-full">
          {etapas.map((e) => (
            <ColumnaEtapa key={e.id} etapa={e} items={columnas[e.id] || []} onOpen={onAbrirConversacion} />
          ))}
        </div>
      </HorizontalScrollArea>
      <DragOverlay>
        {activa && (
          <div className="rounded-xl glass-panel p-2.5 w-[260px]">
            <div className="flex items-center gap-2">
              <WhatsAppAvatar fotoUrl={activa.foto_perfil_url} nombre={nombreConversacion(activa)} size={28} />
              <div className="text-[12.5px] font-bold truncate">{nombreConversacion(activa)}</div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
