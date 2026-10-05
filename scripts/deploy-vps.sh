#!/usr/bin/env bash
# Despliegue de AGENCIA GOZZ CRM al VPS (agencia.sandrogozz.com).
#   scripts/deploy-vps.sh            → sube el código, instala, compila API + frontend, migra y reinicia agencia-*
#   scripts/deploy-vps.sh --frontend → solo frontend (cambios visuales): sube, compila y reinicia agencia-frontend
# 🔴 Nunca toca los procesos `gozz-*` (CRM de inmigración) ni otros vhosts del servidor.
set -euo pipefail
HOST="root@5.189.156.172"
KEY="${SSH_KEY:-$HOME/.ssh/gozz_deploy}"
SSH="ssh -i $KEY -o BatchMode=yes"
MODE="${1:-full}"

tar --exclude=node_modules --exclude=.next --exclude=dist --exclude=.git --exclude=data \
    --exclude=__pycache__ --exclude='*.tsbuildinfo' --exclude=.env --exclude=.env.local \
    --exclude=venv --exclude=logs -czf - . | $SSH $HOST 'tar -xzf - -C /root/agencia-crm'

if [ "$MODE" = "--frontend" ]; then
  $SSH $HOST 'cd /root/agencia-crm && pnpm install --frozen-lockfile --silent && pnpm --filter ./apps/frontend build 2>&1 | tail -6 && pm2 restart agencia-frontend'
else
  $SSH $HOST 'cd /root/agencia-crm && pnpm install --frozen-lockfile --silent && pnpm --filter ./apps/api build && pnpm --filter ./apps/frontend build 2>&1 | tail -6 && pnpm migrate | tail -3 && pm2 restart agencia-api agencia-frontend agencia-email-worker agencia-whatsapp-worker agencia-ai'
fi
echo "Verificando en el dominio real…"
bash "$(dirname "$0")/smoke-prod.sh"
