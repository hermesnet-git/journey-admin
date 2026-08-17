#!/bin/sh
# Limpa e repopula o banco journey_admin com massa_de_dados_journeys.sql, depois publica todas as
# jornadas criadas via API real do admin/back (POST /journeys/{id}/publish).
set -e

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
export PGPASSWORD=postgres
export PGCLIENTENCODING=UTF8
PGDATABASE=journey_admin

API_BASE=http://localhost:8081/api/v1
API_USER=admin
API_PASS=admin

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQLFILE="$SCRIPT_DIR/massa_de_dados_journeys.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql nao encontrado no PATH. Instale o cliente PostgreSQL (ex.: 'brew install libpq' no macOS e adicione ao PATH) ou ajuste este script." >&2
  exit 1
fi

echo "Limpando e populando \"$PGDATABASE\" ($PGHOST:$PGPORT) com \"$SQLFILE\" ..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQLFILE"
echo "Massa de dados populada."

echo ""
echo "Autenticando em $API_BASE ..."
LOGIN_RESPONSE=$(curl -sf -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"username\":\"$API_USER\",\"password\":\"$API_PASS\"}") || {
  echo "Nao foi possivel autenticar no admin/back ($API_BASE) - ele esta rodando?" >&2
  exit 1
}
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Nao foi possivel extrair o token de autenticacao da resposta: $LOGIN_RESPONSE" >&2
  exit 1
fi

echo "Publicando todas as jornadas via API..."
IDS=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A -c "SELECT journey_id FROM journey;")

OK=0
FAIL=0
for ID in $IDS; do
  [ -z "$ID" ] && continue
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_BASE/journeys/$ID/publish" \
    -H "Authorization: Bearer $TOKEN")
  if [ "$HTTP_CODE" = "200" ]; then
    OK=$((OK + 1))
  else
    FAIL=$((FAIL + 1))
    echo "  Falha ao publicar $ID (HTTP $HTTP_CODE)"
  fi
done

echo ""
echo "Publicadas: $OK   Falharam: $FAIL   Total: $((OK + FAIL))"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
