#!/bin/sh
# Limpa e repopula o banco journey_admin com massa_de_dados_journeys.sql, que e um dump literal
# do estado real do banco (jornadas, versoes e publicacoes ja inclusas no snapshot).
set -e

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
export PGPASSWORD=postgres
export PGCLIENTENCODING=UTF8
PGDATABASE=journey_admin

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQLFILE="$SCRIPT_DIR/massa_de_dados_journeys.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql nao encontrado no PATH. Instale o cliente PostgreSQL (ex.: 'brew install libpq' no macOS e adicione ao PATH) ou ajuste este script." >&2
  exit 1
fi

echo "Limpando e populando \"$PGDATABASE\" ($PGHOST:$PGPORT) com \"$SQLFILE\" ..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQLFILE"
echo "Massa de dados populada."
exit 0
