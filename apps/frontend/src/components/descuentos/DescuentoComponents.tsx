"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Percent, X, Loader2, Check, Ban, Clock, CheckCircle2, DollarSign } from "@/lib/bootstrap-icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth-user";

export function DescuentoRow({ d, onReload }: { d: any; onReload: () => void }) {
  const { isAdmin } = useCurrentUser();
  const [comentario, setComentario] = useState("");
  const [revising, setRevising] = useState<null | "aprobar" | "rechazar">(null);

  const revisar = async (accion: "aprobar" | "rechazar") => {
    // Rechazar sin motivo dejó de ser posible con la 0065 (CHECK `rechazada ⇒ motivo_rechazo`).
    // Se corta aquí para no gastar un viaje al servidor que ya sabemos que da 400.
    if (accion === "rechazar" && !comentario.trim()) { toast.error("El motivo del rechazo es obligatorio"); return; }
    setRevising(accion);
    try {
      const r = await fetch(`/api/descuentos/${d.id}/revisar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, comentario })
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Error"); }
      toast.success(accion === "aprobar" ? "Descuento aprobado" : "Descuento rechazado");
      onReload();
    } catch (e: any) { toast.error(e.message); } finally { setRevising(null); }
  };

  // Estados en femenino desde la 0065: la tabla de descuentos ya no tiene vocabulario propio.
  const estadoColor = { pendiente: "#f0b040", aprobada: "#16b91a", rechazada: "#e30b0b", ejecutada: "#1E88E5" }[d.estado as string] || "#94a3b8";
  const Icon = d.estado === "pendiente" ? Clock : d.estado === "rechazada" ? Ban : CheckCircle2;
  const display = d.monto ? `$${Number(d.monto).toFixed(2)}` : `${Number(d.porcentaje).toFixed(1)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={cn("bg-bg-darkcard rounded-xl border px-4 py-3", d.estado === "pendiente" ? "border-brand-gold/50 ring-2 ring-brand-gold/10" : "border-line")}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: estadoColor + "15", color: estadoColor }}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-sm">{display}</span>
            <span className="text-[12px] font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ backgroundColor: estadoColor + "15", color: estadoColor }}>{d.estado}</span>
            {d.referido_nombre && <span className="text-[12px] bg-brand-orange/10 text-brand-orange font-ui font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">Ref: {d.referido_nombre}</span>}
          </div>
          <div className="text-[11px] text-ink-sub mt-0.5">{d.motivo}</div>
          <div className="text-[10px] text-ink-sub mt-0.5">
            Solicitado por <strong>{d.solicitante_nombre || "—"}</strong> · {new Date(d.created_at).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            {d.aprobador_nombre && <> · Revisado por <strong>{d.aprobador_nombre}</strong></>}
            {d.motivo_rechazo && <> · <em>{d.motivo_rechazo}</em></>}
          </div>
        </div>

        {d.estado === "pendiente" && isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Motivo (oblig. si rechazas)" className="h-8 px-2 rounded-lg bg-white/[0.04] border border-line text-[11px] outline-none focus:bg-white/[0.06] focus:border-brand-orange w-40" />
            <button onClick={() => revisar("aprobar")} disabled={!!revising} className="h-8 w-8 rounded-lg bg-brand-green/10 text-brand-green hover:bg-brand-green/20 flex items-center justify-center disabled:opacity-60">
              {revising === "aprobar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>
            <button onClick={() => revisar("rechazar")} disabled={!!revising} className="h-8 w-8 rounded-lg bg-brand-red/10 text-brand-red hover:bg-brand-red/20 flex items-center justify-center disabled:opacity-60">
              {revising === "rechazar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface DescuentoModalProps {
  open: boolean;
  onClose: () => void;
  opId: string;
  valorTotal: number;
  onSaved: () => void;
}

export function DescuentoModal({ open, onClose, opId, valorTotal, onSaved }: DescuentoModalProps) {
  const [tipo, setTipo] = useState<"monto" | "porcentaje">("monto");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [refQ, setRefQ] = useState("");
  const [refResults, setRefResults] = useState<any[]>([]);
  const [refSelected, setRefSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTipo("monto"); setValor(""); setMotivo(""); setRefQ(""); setRefResults([]); setRefSelected(null);
    }
  }, [open]);

  useEffect(() => {
    if (!refQ || refQ.length < 2) { setRefResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/contactos/search?q=${encodeURIComponent(refQ)}`).then((r) => r.json()).then((d) => {
        setRefResults((d.contactos || []).filter((c: any) => Number(c.saldo_referidos_usd || 0) > 0));
      });
    }, 200);
    return () => clearTimeout(t);
  }, [refQ]);

  if (!open) return null;

  const valorNum = Number(valor);
  const montoEstimado = tipo === "monto" ? valorNum : valorTotal * (valorNum / 100);
  const dateError = isNaN(valorNum) || valorNum <= 0 ? "Valor inválido" : null;

  const submit = async () => {
    if (!motivo.trim()) { toast.error("El motivo es obligatorio"); return; }
    if (dateError) { toast.error(dateError); return; }
    setSaving(true);
    try {
      const body: any = {
        motivo: motivo.trim(),
        referido_contacto_id: refSelected?.id || null
      };
      if (tipo === "monto") body.monto = valorNum;
      else body.porcentaje = valorNum;

      const r = await fetch(`/api/oportunidades/${opId}/descuento`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.[0]?.message || d.error || "Error");
      toast.success("Solicitud enviada · esperando aprobación de admin");
      onSaved();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="modal-surface rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-line">
          <div className="h-10 w-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
            <Percent className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-ui uppercase tracking-wider text-brand-orange">Solicitud</div>
            <h3 className="font-display text-xl font-black">Aplicar descuento</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white/[0.04] flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[12px] font-ui uppercase tracking-wider text-ink-sub block mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setTipo("monto")} className={cn("h-11 rounded-xl text-[13px] font-ui font-bold uppercase tracking-wider border transition flex items-center justify-center gap-1.5", tipo === "monto" ? "bg-brand-orange text-white border-brand-orange" : "bg-bg-darkcard border-line text-ink-sub")}>
                <DollarSign className="h-3.5 w-3.5" /> Monto fijo
              </button>
              <button onClick={() => setTipo("porcentaje")} className={cn("h-11 rounded-xl text-[13px] font-ui font-bold uppercase tracking-wider border transition flex items-center justify-center gap-1.5", tipo === "porcentaje" ? "bg-brand-orange text-white border-brand-orange" : "bg-bg-darkcard border-line text-ink-sub")}>
                <Percent className="h-3.5 w-3.5" /> Porcentaje
              </button>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-ui uppercase tracking-wider text-ink-sub block mb-1.5">
              {tipo === "monto" ? "Monto USD" : "Porcentaje (%)"}
            </label>
            <div className="relative">
              <input
                autoFocus type="number" step="0.01" min="0" max={tipo === "porcentaje" ? 100 : undefined}
                value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder={tipo === "monto" ? "0.00" : "0"}
                className="w-full h-12 pl-9 pr-4 rounded-xl bg-bg-darkcard border border-line text-lg font-bold outline-none focus:ring-4 focus:ring-brand-orange/15 focus:border-brand-orange"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-sub font-bold">{tipo === "monto" ? "$" : "%"}</span>
            </div>
            {valorNum > 0 && (
              <div className="mt-1.5 text-[11px] text-ink-sub">
                {tipo === "monto"
                  ? `${((valorNum / valorTotal) * 100).toFixed(1)}% del total ($${valorTotal.toFixed(2)})`
                  : `$${montoEstimado.toFixed(2)} de $${valorTotal.toFixed(2)} total`}
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-ui uppercase tracking-wider text-ink-sub block mb-1.5">Motivo *</label>
            <textarea
              value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica por qué se aplica este descuento..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-bg-darkcard border border-line text-sm outline-none resize-none focus:ring-4 focus:ring-brand-orange/15 focus:border-brand-orange"
            />
          </div>

          <div>
            <label className="text-[12px] font-ui uppercase tracking-wider text-ink-sub block mb-1.5">Referido (opcional)</label>
            <div className="relative">
              {refSelected ? (
                <div className="bg-brand-orange/5 border border-brand-orange/30 rounded-xl px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{refSelected.nombre_completo}</div>
                    <div className="text-[10px] text-ink-sub">Saldo disponible: <strong className="text-brand-green">${Number(refSelected.saldo_referidos_usd).toFixed(2)}</strong></div>
                  </div>
                  <button onClick={() => { setRefSelected(null); setRefQ(""); }} className="h-6 w-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-ink-sub"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <input
                  value={refQ} onChange={(e) => setRefQ(e.target.value)}
                  placeholder="Buscar contacto con saldo de referido..."
                  className="w-full h-11 px-4 rounded-xl bg-bg-darkcard border border-line text-sm outline-none focus:ring-4 focus:ring-brand-orange/15 focus:border-brand-orange"
                />
              )}
              {refResults.length > 0 && !refSelected && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-darkcard rounded-xl border border-line shadow-xl z-10 max-h-60 overflow-y-auto">
                  {refResults.map((r) => (
                    <button key={r.id} type="button" onClick={() => { setRefSelected(r); setRefQ(""); setRefResults([]); }} className="w-full px-3 py-2 text-left hover:bg-white/[0.04] text-sm border-b border-line last:border-0">
                      <div className="font-semibold">{r.nombre_completo}</div>
                      <div className="text-[10px] text-ink-sub">Saldo: ${Number(r.saldo_referidos_usd).toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 text-[10px] text-ink-sub">Si hay referido, se descontará de su saldo al aprobar.</div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-line flex items-center gap-2 bg-bg-darkcard">
          <div className="flex-1" />
          <button onClick={onClose} className="h-11 px-5 rounded-xl bg-bg-darkcard border border-line font-ui text-[13px] font-bold uppercase tracking-wider hover:bg-white/[0.04] text-ink-sub">Cancelar</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={submit} disabled={saving || !motivo.trim() || !!dateError} className="h-11 px-6 bg-brand-blue text-white rounded-xl font-ui text-[13px] font-bold uppercase tracking-wider shadow-lg disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enviar solicitud
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
