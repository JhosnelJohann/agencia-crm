"use client";
import { useMemo } from "react";
import { DndContext, type DragEndEvent, DragOverlay, PointerSensor, useDndContext, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { CheckSquare, Calendar, AlertCircle, Clock, Pause, Play, X } from "@/lib/bootstrap-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/auth-user";
import { HorizontalScrollArea } from "@/components/ui/HorizontalScrollArea";
import { DISTANCIA_ARRASTRE, agruparSinRepetir, buscarEnListas, guardarCambioDeTarea, opacidadDeTarjeta } from "@/lib/tareas-tablero";
import type { TareaRow } from "./TaskCard";

interface Props {
  tareas: TareaRow[];
  /**
   * 🔴 Completadas Y CANCELADAS se cargan aparte: el listado por defecto excluye las dos (son
   * 25.000+ filas y esta por rendimiento). Antes solo llegaban las completadas, asi que arrastrar
   * a «Cancelada» hacia DESAPARECER la tarjeta — el PATCH funcionaba, pero nadie volvia a pedir esa
   * tarea y la columna seguia marcando 0. El dato estaba intacto; recuperarlo, imposible desde aqui.
   */
  completadas?: TareaRow[];
  canceladas?: TareaRow[];
  onOpen: (t: TareaRow) => void;
  onReload: () => void;
}

const COLUMNS: { key: TareaRow["estado"]; label: string; color: string; icon: any }[] = [
  { key: "pendiente",   label: "Pendiente",   color: "#5d8fa8", icon: Clock },
  { key: "en_progreso", label: "En progreso", color: "#e8581a", icon: Play },
  { key: "completada",  label: "Completada",  color: "#16b91a", icon: CheckSquare },
  { key: "cancelada",   label: "Cancelada",   color: "#94a3b8", icon: X }
];

const ESTADOS = COLUMNS.map((c) => c.key);

export function KanbanTareas({ tareas, completadas = [], canceladas = [], onOpen, onReload }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: DISTANCIA_ARRASTRE } }));

  const buckets = useMemo(() => {
    // El reparto sin repetidos lo pone `agruparSinRepetir`, compartido con el tablero por fecha.
    const { grupos: m, poner } = agruparSinRepetir(ESTADOS);
    for (const t of tareas) {
      if (m[t.estado]) poner(t, t.estado);
    }
    // Las que la lista activa excluye vienen aparte, a su columna.
    for (const t of completadas) poner(t, "completada");
    for (const t of canceladas) poner(t, "cancelada");
    // Dentro de cada columna: de la más reciente a la más vieja. La columna Completada
    // ordena por fecha de completado (la recién completada queda arriba); el resto por creación.
    for (const k of ESTADOS) {
      if (k === "completada") {
        m[k].sort((a, b) => new Date((b as any).fecha_completada || b.created_at).getTime() - new Date((a as any).fecha_completada || a.created_at).getTime());
      } else {
        m[k].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    }
    return m;
  }, [tareas, completadas, canceladas]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const newEstado = String(e.over.id) as TareaRow["estado"];
    const id = String(e.active.id);
    // 🔴 Se busca en las TRES listas, no solo en la activa. Si solo se mirara `tareas`, arrastrar
    // una cancelada de vuelta a «Pendiente» no encontraria la tarea y no haria nada — que es
    // exactamente el «no se puede recuperar» que esta entrega viene a arreglar.
    const t = buscarEnListas(id, tareas, completadas, canceladas);
    if (!t || t.estado === newEstado) return;
    if (!(await guardarCambioDeTarea(id, { estado: newEstado }))) { toast.error("No se pudo mover"); return; }
    toast.success(`Movida a ${newEstado.replace("_", " ")}`);
    onReload();
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <HorizontalScrollArea className="pb-4">
        <div className="flex gap-3">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              id={col.key}
              label={col.label}
              color={col.color}
              Icon={col.icon}
              tareas={buckets[col.key] || []}
              onOpen={onOpen}
            />
          ))}
        </div>
      </HorizontalScrollArea>
      <SombraArrastrada tareas={tareas} completadas={completadas} canceladas={canceladas} />
    </DndContext>
  );
}

/**
 * 🔴 QUE SE ESTA ARRASTRANDO SE LE PREGUNTA A dnd-kit, NO SE LLEVA UNA COPIA.
 *
 * Este tablero guardaba su propio `dragId` en un `useState`, y **no tenia `onDragCancel`**: pulsar
 * Escape o soltar fuera de una columna dejaba esa copia encendida, con la sombra del arrastre
 * pegada a la pantalla. El otro tablero si lo tenia, asi que ademas los dos trataban el arrastre
 * de dos formas distintas.
 *
 * Ya no hay copia que sincronizar ni manejador que se pueda olvidar: se lee el estado de dnd-kit,
 * que se limpia SIEMPRE al terminar un arrastre, termine como termine.
 */
function SombraArrastrada({ tareas, completadas, canceladas }: {
  tareas: TareaRow[]; completadas: TareaRow[]; canceladas: TareaRow[];
}) {
  const { active } = useDndContext();
  const t = active ? buscarEnListas(String(active.id), tareas, completadas, canceladas) : null;
  return <DragOverlay>{t && <MiniCard tarea={t} dragging />}</DragOverlay>;
}

function KanbanColumn({ id, label, color, Icon, tareas, onOpen }: {
  id: string; label: string; color: string; Icon: any; tareas: TareaRow[]; onOpen: (t: TareaRow) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="glass-3d rounded-2xl transition-shadow flex flex-col min-h-[320px] flex-1 min-w-[260px]"
      style={isOver ? { boxShadow: "inset 0 0 0 2px rgba(232,88,26,0.55), 0 0 36px -10px rgba(232,88,26,0.5)" } : undefined}
    >
      <div className="px-3 pt-3 pb-2 flex items-center gap-2 border-b border-white/[0.06]">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color, boxShadow: `0 4px 14px -4px ${color}99` }}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <div className="flex-1 font-ui font-bold text-[13px] uppercase tracking-[0.1em] text-ink-sub">{label}</div>
        <span className="h-5 min-w-5 px-1 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-ink-sub tabular-nums">{tareas.length}</span>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {tareas.length === 0 ? (
          <div className="text-[11.5px] text-ink-sub text-center py-10 px-3">
            <div className="h-10 w-10 rounded-full bg-white/[0.04] mx-auto mb-2.5 flex items-center justify-center" style={{ color }}>
              <Icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            Arrastra una tarea aquí
          </div>
        ) : (
          tareas.map((t, i) => <DraggableCard key={t.id} tarea={t} index={i} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ tarea, index, onOpen }: { tarea: TareaRow; index: number; onOpen: (t: TareaRow) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tarea.id });
  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // 🔴 La entrada desliza, NO se desvanece. Un `opacity: 0` de arranque es la otra forma de
      // que una tarjeta se quede invisible: si la animacion no llega a correr, se queda en 0 y
      // nadie vuelve a verla. Con esto, en este fichero no hay NINGUN camino que pinte una
      // tarjeta a opacidad 0 — ni entrando, ni arrastrando.
      initial={{ y: 6 }}
      // 🔴 NUNCA 0. Ver `opacidadDeTarjeta`: una tarjeta que existe y no se ve es peor que una
      // que se ve mal, y atar la visibilidad al estado interno de dnd-kit es lo que lo permitia.
      animate={{ opacity: opacidadDeTarjeta(isDragging), y: 0 }}
      transition={{ delay: Math.min(0.02 * index, 0.2) }}
      onClick={() => !isDragging && onOpen(tarea)}
    >
      <MiniCard tarea={tarea} />
    </motion.div>
  );
}

function MiniCard({ tarea, dragging }: { tarea: TareaRow; dragging?: boolean }) {
  const vencida = !!tarea.fecha_limite && tarea.estado !== "completada" && new Date(tarea.fecha_limite) < new Date();
  const borderColor = tarea.color_prioridad || "#94a3b8";
  const avatar = tarea.responsable_nombre && (
    tarea.responsable_foto ? (
      <img src={tarea.responsable_foto} className="h-5 w-5 rounded-full object-cover border border-bg-darkcard" alt="" />
    ) : (
      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-orange to-brand-gold text-white text-[8px] font-bold flex items-center justify-center border border-bg-darkcard">
        {initialsOf(tarea.responsable_nombre)}
      </div>
    )
  );
  return (
    <div
      className={cn(
        "glass-3d rounded-xl cursor-grab active:cursor-grabbing transition-shadow",
        dragging ? "shadow-2xl rotate-2" : "hover:shadow-[0_14px_30px_-16px_rgba(232,88,26,0.4)]"
      )}
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-ui font-semibold uppercase tracking-wider text-ink-sub">#{tarea.numero_tarea}</span>
          <span
            className="text-[11px] font-ui font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-full ml-auto"
            style={{ backgroundColor: borderColor, boxShadow: `0 3px 10px -3px ${borderColor}99` }}
          >
            {tarea.prioridad[0].toUpperCase()}
          </span>
        </div>
        <div className={cn("font-display font-bold text-[13px] leading-tight line-clamp-2", tarea.estado === "completada" && "line-through text-ink-sub")}>
          {tarea.titulo}
        </div>
        {tarea.oportunidad_nombre && (
          <div className="text-[10px] text-ink-sub truncate mt-1">{tarea.oportunidad_nombre}</div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
          {tarea.fecha_limite ? (
            <span className={cn("flex items-center gap-1 text-[12px] font-ui", vencida ? "text-brand-red font-bold" : "text-ink-sub")}>
              {vencida ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" strokeWidth={1.8} />}
              {new Date(tarea.fecha_limite).toLocaleDateString("es", { day: "2-digit", month: "short" })}
            </span>
          ) : <span />}
          <div className="flex -space-x-1.5">
            {avatar && (vencida ? (
              <span className="relative inline-block h-5 w-5 rounded-full">
                <span className="halo-ring !rounded-full" />
                {avatar}
              </span>
            ) : avatar)}
          </div>
        </div>
      </div>
    </div>
  );
}
