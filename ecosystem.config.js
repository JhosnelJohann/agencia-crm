// PM2 — AGENCIA GOZZ CRM (agencia.sandrogozz.com).
// 🔴 Vive en el mismo VPS que el CRM de inmigración (procesos `gozz-*`, puertos 3100/4100/8100) y
// Cal.diy (3200): por eso todo aquí tiene nombre `agencia-*` y puertos propios (3300/4300/8300).
// Nunca reiniciar ni tocar los procesos `gozz-*`.
module.exports = {
  apps: [
    {
      name: "agencia-frontend",
      cwd: "/root/agencia-crm/apps/frontend",
      script: "/root/agencia-crm/apps/frontend/.next/standalone/apps/frontend/server.js",
      interpreter: "node",
      env: { NODE_ENV: "production", PORT: "3300", HOSTNAME: "0.0.0.0" },
      max_memory_restart: "800M",
      min_uptime: "15s",
      max_restarts: 10,
      error_file: "/root/agencia-crm/logs/frontend-err.log",
      out_file: "/root/agencia-crm/logs/frontend-out.log"
    },
    {
      name: "agencia-api",
      cwd: "/root/agencia-crm/apps/api",
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: { NODE_ENV: "production", PORT: "4300" },
      max_memory_restart: "1G",
      error_file: "/root/agencia-crm/logs/api-err.log",
      out_file: "/root/agencia-crm/logs/api-out.log"
    },
    {
      // email-sync aislado: un flap del mailserver NO puede tumbar agencia-api. Ver apps/api/src/email-worker.ts
      name: "agencia-email-worker",
      cwd: "/root/agencia-crm/apps/api",
      script: "/root/agencia-crm/apps/api/dist/email-worker.js",
      interpreter: "node",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      min_uptime: "15s",
      max_restarts: 10,
      error_file: "/root/agencia-crm/logs/email-worker-err.log",
      out_file: "/root/agencia-crm/logs/email-worker-out.log"
    },
    {
      // WhatsApp (Baileys) aislado: un corte/reconexión NO puede tumbar agencia-api. Ver apps/api/src/whatsapp-worker.ts
      name: "agencia-whatsapp-worker",
      cwd: "/root/agencia-crm/apps/api",
      script: "/root/agencia-crm/apps/api/dist/whatsapp-worker.js",
      interpreter: "node",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      min_uptime: "15s",
      max_restarts: 10,
      error_file: "/root/agencia-crm/logs/whatsapp-worker-err.log",
      out_file: "/root/agencia-crm/logs/whatsapp-worker-out.log"
    },
    {
      name: "agencia-ai",
      cwd: "/root/agencia-crm/apps/ai",
      script: "/root/agencia-crm/apps/ai/venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8300",
      interpreter: "none",
      env: { PYTHONUNBUFFERED: "1" },
      max_memory_restart: "800M",
      error_file: "/root/agencia-crm/logs/ai-err.log",
      out_file: "/root/agencia-crm/logs/ai-out.log"
    }
    // Videollamadas (LiveKit): desactivadas en v1. El LiveKit del CRM original ocupa el puerto
    // 7880/8080 y UDP 50000–50100; activarlas aquí exige puertos y un vhost distintos.
  ]
};
