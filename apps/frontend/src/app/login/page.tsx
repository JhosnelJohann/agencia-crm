"use client";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/magic/BrandMark";
import { LoginForm } from "@/features/auth/components/LoginForm";

/**
 * Acceso a GOZZ. Compacto a propósito: el formulario debe caber sin scroll incluso en portátiles
 * de 600 px de alto. La escena 3D de fondo (SceneHost, en el layout raíz) se acerca en esta pantalla.
 */
export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-ink flex items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandMark size="lg" />
          <div className="kicker mt-4">El CRM de marketing</div>
          <h1 className="mt-2 text-[clamp(24px,4.4vw,34px)] text-ink">
            El futuro del marketing <span className="text-brand-orange text-orange-glow">al alcance de tus manos.</span>
          </h1>
        </div>

        <div className="glass-3d glass-blur rounded-[28px] p-6 sm:p-8">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-ink-muted">© Sandro Gozz · GOZZ</p>
      </motion.div>
    </main>
  );
}
