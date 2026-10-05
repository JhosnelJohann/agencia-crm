"use client";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Botones de sandrogozz.com: radio 6px, DM Sans 700, primario con gradiente naranja y brillo cálido.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-sans font-bold transition-all duration-300 ease-landing disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-brand-primary to-brand-primaryDark text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-transparent text-ink border border-line hover:border-brand-primary/25 hover:bg-brand-primary/10",
        ghost:
          "text-ink-sub hover:text-ink hover:bg-white/[0.05]",
        danger: "bg-brand-red/10 text-brand-red hover:bg-brand-red/20"
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
