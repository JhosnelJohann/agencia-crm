"use client";
import Link from "next/link";
import { AnimatedModal } from "@/components/ui/AnimatedModal";
import { Button } from "@/components/ui/Button";
import { X, Link2, Briefcase, CheckCircle2 } from "@/lib/bootstrap-icons";
import { WhatsAppAvatar } from "./WhatsAppAvatar";
import { formatearNumeroWhatsApp, nombreConversacion } from "@/lib/whatsapp-numero";
import type { WhatsAppConversacionDetalle, WhatsAppMensaje } from "./types";

interface Props {
  conversacion: WhatsAppConversacionDetalle;
  onClose: () => void;
  onVincular: () => void;
  onConvertir: () => void;
  /** Mensajes cargados de la conversación — para la galería de fotos y archivos compartidos. */
  mensajes?: WhatsAppMensaje[] | null;
}

const VINCULO_LABEL: Record<WhatsAppConversacionDetalle["contacto_vinculo_estado"], string> = {
  sin_vincular: "Sin vincular a un contacto",
  vinculado_auto: "Vinculado automáticamente por teléfono",
  vinculado_manual: "Vinculado a un contacto",
};

export function PerfilConversacionModal({ conversacion, onClose, onVincular, onConvertir, mensajes }: Props) {
  const nombre = nombreConversacion(conversacion);
  const { texto: numero, bandera } = formatearNumeroWhatsApp(conversacion.telefono_real || conversacion.wa_jid);
  const vivos = (mensajes || []).filter((m) => m.archivo_url && !m.borrado_at);
  const fotos = vivos.filter((m) => m.tipo === "imagen").slice(-9).reverse();
  const documentos = vivos.filter((m) => m.tipo === "archivo").slice(-5).reverse();
  return (
    <AnimatedModal onClose={onClose} panelClassName="w-full max-w-sm glass-panel rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
        <div className="flex-1 font-display font-black text-sm">Perfil de la conversación</div>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 flex flex-col items-center text-center gap-1">
        {conversacion.foto_perfil_url ? (
          <a href={conversacion.foto_perfil_url} target="_blank" rel="noopener noreferrer" title="Ver foto en grande">
            <img src={conversacion.foto_perfil_url} alt="" className="h-32 w-32 rounded-full object-cover ring-4 ring-white/10 hover:ring-brand-primary/40 transition" />
          </a>
        ) : (
          <WhatsAppAvatar fotoUrl={null} nombre={nombre} size={120} className="text-3xl" />
        )}
        <div className="mt-3 text-lg font-display font-black">{nombre}</div>
        <div className="text-sm text-ink-sub">{bandera ? `${bandera} ` : ""}{numero}</div>
        {conversacion.info_perfil && <div className="mt-1 text-[13px] text-ink-sub italic max-w-[260px]">“{conversacion.info_perfil}”</div>}
        <div className={`mt-1 text-[13px] font-ui font-bold uppercase tracking-wider ${conversacion.contacto_id ? "text-brand-green" : "text-ink-sub"}`}>
          {VINCULO_LABEL[conversacion.contacto_vinculo_estado]}
        </div>

        <div className="w-full space-y-2 pt-5">
          {conversacion.contacto_id ? (
            <>
              <Link href={`/contactos/${conversacion.contacto_id}`}>
                <Button variant="secondary" className="w-full">Ver contacto en el CRM</Button>
              </Link>
              {conversacion.oportunidad_id ? (
                <div className="h-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center gap-2 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4" weight="fill" /> Ya convertida a Oportunidad
                </div>
              ) : (
                <Button onClick={onConvertir} className="w-full">
                  <Briefcase className="h-4 w-4" /> Convertir a Oportunidad
                </Button>
              )}
            </>
          ) : (
            <Button onClick={onVincular} className="w-full">
              <Link2 className="h-4 w-4" /> Agregar o vincular contacto
            </Button>
          )}
        </div>

        {(fotos.length > 0 || documentos.length > 0) && (
          <div className="w-full pt-5 text-left">
            <div className="text-[11px] font-ui font-bold uppercase tracking-wider text-ink-sub mb-2">Archivos y fotos compartidos</div>
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {fotos.map((m) => (
                  <a key={m.id} href={m.archivo_url!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-black/20">
                    <img src={m.archivo_url!} alt="" loading="lazy" className="h-full w-full object-cover hover:scale-105 transition" />
                  </a>
                ))}
              </div>
            )}
            {documentos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {documentos.map((m) => (
                  <li key={m.id}>
                    <a href={m.archivo_url!} download={m.archivo_nombre || true} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-black/5 dark:hover:bg-white/5 truncate">
                      📎 <span className="truncate">{m.archivo_nombre || "documento"}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}
