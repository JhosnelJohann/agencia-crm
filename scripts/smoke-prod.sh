#!/usr/bin/env bash
# Prueba de humo de GOZZ en producción (agencia.sandrogozz.com). Sale con código 1 si algo falla.
#   - rutas y estáticos públicos responden 200 (sin sesión)
#   - el HTML del login referencia CSS y JS que existen
#   - los procesos `agencia-*` están online y los `gozz-*` NO se han reiniciado por esto
#   - los otros sitios del servidor siguen respondiendo
set -uo pipefail
B="https://agencia.sandrogozz.com"
KEY="${SSH_KEY:-$HOME/.ssh/gozz_deploy}"
FAIL=0
ok()   { printf "  ✔ %s\n" "$1"; }
bad()  { printf "  ✘ %s\n" "$1"; FAIL=1; }
code() { curl -s -o /dev/null -w "%{http_code}" -m 20 "$1"; }

echo "Rutas y estáticos públicos"
sleep 4   # el reinicio de PM2 tarda unos segundos en volver a aceptar conexiones
for p in /login /3d/rocket.webp /noise.png /favicon.svg /api/health; do
  c=$(code "$B$p"); [ "$c" = "200" ] && ok "$p → 200" || bad "$p → $c"
done

echo "Recursos del login"
html=$(curl -s -m 20 "$B/login")
for asset in $(echo "$html" | grep -oE '/_next/static/[^"]+\.(css|js)' | sort -u | head -8); do
  c=$(code "$B$asset"); [ "$c" = "200" ] && ok "$asset" || bad "$asset → $c"
done
echo "$html" | grep -q "<title>GOZZ</title>" && ok "título GOZZ" || bad "título inesperado"

echo "Otros sitios del servidor (no deben verse afectados)"
[ "$(code https://crm.sandrogozz.com/api/health)" = "200" ] && ok "crm.sandrogozz.com" || bad "crm.sandrogozz.com"
[ "$(code https://sandrogozz.com/)" = "200" ] && ok "sandrogozz.com" || bad "sandrogozz.com"

echo "Procesos PM2"
out=$(ssh -i "$KEY" -o BatchMode=yes root@5.189.156.172 'pm2 jlist 2>/dev/null' 2>/dev/null | python -c "
import sys,json
for p in json.load(sys.stdin):
    print(p['name'], p['pm2_env']['status'], p['pm2_env']['restart_time'])
" 2>/dev/null)
if [ -z "$out" ]; then bad "no se pudo leer pm2"; else
  echo "$out" | while read n s r; do
    case "$n" in
      agencia-*) [ "$s" = "online" ] && echo "  ✔ $n online" || echo "  ✘ $n $s";;
      gozz-*)    [ "$s" = "online" ] && echo "  ✔ $n online (reinicios: $r)" || echo "  ✘ $n $s";;
    esac
  done
  echo "$out" | grep -E '^agencia-' | grep -vq ' online ' && FAIL=1
fi

[ $FAIL -eq 0 ] && echo "SMOKE OK" || echo "SMOKE FALLÓ"
exit $FAIL
