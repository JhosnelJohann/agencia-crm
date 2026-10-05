import { cn } from "@/lib/utils";
import { AlertCircle, Clock, CheckCircle2 } from "@/lib/bootstrap-icons";

interface Props {
  estado: "on_track" | "warning" | "vencido" | "completado";
  fechaLimite?: string | null;
  className?: string;
}

export function SLABadge({ estado, fechaLimite, className }: Props) {
  const cfg = {
    on_track:   { bg: "bg-green-500/10",  text: "text-green-400",  Icon: CheckCircle2, label: "A tiempo" },
    warning:    { bg: "bg-yellow-500/10", text: "text-yellow-400", Icon: Clock,        label: "Atención" },
    vencido:    { bg: "bg-red-500/10",    text: "text-red-400",    Icon: AlertCircle,  label: "Vencido", pulse: true },
    completado: { bg: "bg-white/[0.04]", text: "text-ink-sub", Icon: CheckCircle2, label: "Cerrado" }
  }[estado];
  const { bg, text, Icon, label } = cfg;
  const pulse = estado === "vencido";
  const dias = fechaLimite ? Math.ceil((new Date(fechaLimite).getTime() - Date.now()) / 86400000) : null;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-ui font-bold uppercase tracking-wider", bg, text, className)}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />}
      <Icon className="h-3 w-3" strokeWidth={2} />
      <span>{label}</span>
      {dias !== null && estado !== "completado" && (
        <span className="opacity-60">· {dias >= 0 ? `${dias}d` : `${Math.abs(dias)}d atraso`}</span>
      )}
    </span>
  );
}
