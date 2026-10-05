import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full font-semibold leading-none",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-ink-sub",
        primary: "bg-brand-primary/10 text-brand-primary border border-brand-primary/25",
        success: "bg-brand-green/10 text-brand-green",
        warning: "bg-neon-yellow/20 text-amber-400",
        danger: "bg-brand-red/10 text-brand-red",
        info: "bg-brand-blue/10 text-brand-blue"
      },
      size: {
        sm: "h-4 min-w-4 px-1.5 text-[10px]",
        md: "h-5 min-w-5 px-2 text-[11px]"
      }
    },
    defaultVariants: { variant: "default", size: "md" }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
