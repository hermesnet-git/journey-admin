#!/bin/sh
set -eu

pg_host_factory=localhost
pg_port_factory=5432
pg_user_factory=postgres
admin_database=journey_admin
strapi_database=strapi_sdui_registry
export PGPASSWORD=postgres
export PGCLIENTENCODING=UTF8
admin_api=http://localhost:8081/api/v1
script_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
factory_sql="$script_directory/massa_de_dados_journeys.sql"
runtime_directory="$script_directory/../../../simulacoes/ms-runtime-camunda"
runtime_data_directory="$runtime_directory/camunda-h2-default"
runtime_log="${TMPDIR:-/tmp}/elastic-journey-runtime-reset.log"
rows_file=''

cleanup() { [ -z "$rows_file" ] || [ ! -f "$rows_file" ] || rm -f "$rows_file"; }
trap cleanup EXIT HUP INT TERM
port_is_up() { nc -z localhost "$1" >/dev/null 2>&1; }

for command_name in psql curl nc lsof; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "ERRO: $command_name não foi encontrado no PATH." >&2; exit 1;
  }
done
[ -f "$factory_sql" ] || { echo "ERRO: massa não encontrada: $factory_sql" >&2; exit 1; }

echo 'MARCO ZERO — instalação de fábrica do Elastic Journey'
echo 'O processo substituirá os dados atuais do Admin, Strapi e runtime-engine.'
printf 'Confirma? [s/N] '
read -r confirmation
case "$confirmation" in [sS]) ;; *) echo 'Operação cancelada.'; exit 0 ;; esac

echo '1/5 Validando serviços...'
missing=''
for service in 'runtime-engine:8080' 'admin/back:8081' 'ms-transform-publication:8082' 'ms-spec-registry:8083'; do
  name=${service%:*}; port=${service##*:}
  port_is_up "$port" || missing="$missing $name(porta $port)"
done
[ -z "$missing" ] || { echo "ERRO: serviços indisponíveis:$missing" >&2; exit 1; }

echo '2/5 Reinicializando o runtime-engine...'
runtime_pid=$(lsof -ti tcp:8080 2>/dev/null | head -n 1 || true)
if [ -n "$runtime_pid" ]; then
  kill "$runtime_pid" 2>/dev/null || true
  waited=0
  while port_is_up 8080 && [ "$waited" -lt 15 ]; do sleep 1; waited=$((waited + 1)); done
  port_is_up 8080 && kill -9 "$runtime_pid" 2>/dev/null || true
fi
if [ -d "$runtime_data_directory" ]; then
  find "$runtime_data_directory" -maxdepth 1 -type f -name 'process-engine.*' -delete
fi
(cd "$runtime_directory" && nohup ./mvnw -q spring-boot:run >"$runtime_log" 2>&1 &)
elapsed=0
while ! port_is_up 8080; do
  [ "$elapsed" -lt 180 ] || { echo "ERRO: runtime-engine não iniciou. Consulte $runtime_log" >&2; exit 1; }
  sleep 2; elapsed=$((elapsed + 2))
done

echo '3/5 Verificando snapshots do Strapi...'
if port_is_up 1337; then
  psql -h "$pg_host_factory" -p "$pg_port_factory" -U "$pg_user_factory" -d "$strapi_database" \
    -v ON_ERROR_STOP=1 -c 'TRUNCATE TABLE sdui_snapshots RESTART IDENTITY CASCADE;'
  echo 'Snapshots do Strapi removidos.'
else
  echo 'Strapi não configurado ou indisponível; limpeza ignorada.'
fi

echo '4/5 Restaurando a massa funcional do Admin...'
psql -h "$pg_host_factory" -p "$pg_port_factory" -U "$pg_user_factory" -d "$admin_database" \
  -v ON_ERROR_STOP=1 -f "$factory_sql"

echo '5/5 Republicando versões pelas APIs oficiais...'
login=$(curl -fsS -X POST "$admin_api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}')
token=$(printf '%s' "$login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$token" ] || { echo 'ERRO: o Admin não retornou o token de autenticação.' >&2; exit 1; }
rows_file=$(mktemp)
psql -h "$pg_host_factory" -p "$pg_port_factory" -U "$pg_user_factory" -d "$admin_database" -t -A -F '|' \
  -c "SELECT journey_id,version_id FROM journey_version WHERE version_status='UNPUBLISHED' ORDER BY journey_id,version_number;" >"$rows_file"
published=0
while IFS='|' read -r journey_id version_id; do
  [ -n "$journey_id" ] || continue
  curl -fsS -X POST "$admin_api/journeys/$journey_id/versions/$version_id/republish" \
    -H "Authorization: Bearer $token" >/dev/null
  published=$((published + 1))
done <"$rows_file"
pending=$(psql -h "$pg_host_factory" -p "$pg_port_factory" -U "$pg_user_factory" -d "$admin_database" -t -A \
  -c "SELECT count(*) FROM journey_version WHERE version_status<>'PUBLISHED';" | tr -d '[:space:]')
[ "$pending" = '0' ] || { echo 'ERRO: há versões que não foram publicadas.' >&2; exit 1; }

echo "Marco zero instalado com sucesso. Versões publicadas: $published."
echo 'O runtime-engine permanece em execução.'
