import { defineConfig } from "vitest/config";

// Pruebas UNITARIAS puras (sin base de datos): `pnpm test:unit`. La suite completa (`pnpm test`) usa una base
// desechable; estas corren en cualquier máquina y en segundos.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    env: { DATABASE_URL: "postgresql://nadie:nada@127.0.0.1:1/ninguna", APP_ENC_KEY: "0".repeat(64), JWT_SECRET: "test" },
    reporters: ["verbose"],
  },
});
