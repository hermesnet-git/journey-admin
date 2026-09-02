#!/bin/sh
# Reset completo pra reproduzir o estado "duas jornadas publicadas" em qualquer ambiente:
# 1) checa se admin/back, ms-transform-publication e ms-runtime-camunda estao todos no ar —
#    para com erro claro se algum nao estiver (nao tenta subir nada por conta propria além do
#    ms-runtime-camunda no passo 2, que este script derruba de proposito);
# 2) zera o Camunda: mata o ms-runtime-camunda, apaga o H2 dele, sobe ele de novo (mvnw
#    spring-boot:run em background) e espera a porta voltar — sem isso o BPMN de uma jornada
#    antiga fica "fantasma" no engine, publicada no admin mas ausente do Camunda ou vice-versa
#    (foi exatamente o que aconteceu depois da massa anterior: o restore só recriava o
#    Postgres, nunca o Camunda, entao cada jornada tinha que ser republicada manualmente —
#    ver REQ/ajuste 2026-09-01);
# 3) repopula o Postgres com massa_de_dados_journeys.sql (só a versão PUBLICADA de cada
#    jornada, não o histórico de rascunhos);
# 4) publica cada jornada de verdade via API real do admin/back (POST /journeys/{id}/publish),
#    o que gera o BPMN e implanta no Camunda já zerado.
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
CAMUNDA_PORT=8080
TRANSFORM_PORT=8082
CAMUNDA_RESTART_TIMEOUT_SECONDS=180

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQLFILE="$SCRIPT_DIR/massa_de_dados_journeys.sql"
CAMUNDA_DIR="$SCRIPT_DIR/../../../simulacoes/ms-runtime-camunda"
CAMUNDA_H2_DIR="$CAMUNDA_DIR/camunda-h2-default"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql nao encontrado no PATH. Instale o cliente PostgreSQL (ex.: 'brew install libpq' no macOS e adicione ao PATH) ou ajuste este script." >&2
  exit 1
fi

echo "Este script vai, nesta ordem:"
echo "  1. Checar se admin/back (8081), ms-transform-publication (8082) e ms-runtime-camunda"
echo "     (8080) estao no ar — para com erro se algum nao estiver."
echo "  2. Derrubar o ms-runtime-camunda, apagar o H2 dele (zerando o Camunda), subi-lo de novo"
echo "     e criar o usuario padrao do Camunda (demo/demo)."
echo "  3. Apagar e repopular o banco Postgres \"$PGDATABASE\" com massa_de_dados_journeys.sql."
echo "  4. Publicar, via API do admin/back, cada jornada que ficar com status PUBLISHED nesse SQL."
echo ""
printf "Confirma? [y/N] "
read -r CONFIRM
case "$CONFIRM" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Cancelado."; exit 0 ;;
esac
echo ""

port_is_up() {
  (exec 3<>"/dev/tcp/localhost/$1") 2>/dev/null && { exec 3<&-; return 0; } || return 1
}

# O script sobe o ms-runtime-camunda sozinho (pra zerar/republicar) e nao pode deixar ele no ar
# depois. So mexe na porta se foi ELE quem subiu o processo (SCRIPT_STARTED_CAMUNDA=1) — os
# outros servicos (admin/back, ms-transform-publication) ja estavam no ar antes do script e
# continuam sendo responsabilidade de quem os subiu, nao deste script.
SCRIPT_STARTED_CAMUNDA=0
cleanup() {
  if [ "$SCRIPT_STARTED_CAMUNDA" = "1" ]; then
    PID=$(lsof -ti tcp:"$CAMUNDA_PORT" 2>/dev/null || true)
    if [ -n "$PID" ]; then
      echo ""
      echo "Encerrando o ms-runtime-camunda que este script subiu (porta $CAMUNDA_PORT) ..."
      # O H2 do Camunda tem ate 500ms de write-delay por padrao — sem essa folga antes do kill,
      # a ultima escrita commitada (o publish que acabou de rodar) pode nao ter ido pro disco
      # ainda. SIGTERM (nunca -9 de saida) + esperar o processo morrer de verdade tambem ajuda o
      # shutdown hook do Spring/H2 a terminar.
      sleep 2
      kill "$PID" 2>/dev/null || true
      for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
        kill -0 "$PID" 2>/dev/null || break
        sleep 1
      done
      kill -0 "$PID" 2>/dev/null && kill -9 "$PID" 2>/dev/null || true
    fi
  fi
}
trap cleanup EXIT

echo "1/4 Checando se a stack necessaria esta no ar ..."
MISSING=""
port_is_up "$TRANSFORM_PORT" || MISSING="$MISSING ms-transform-publication(porta $TRANSFORM_PORT)"
port_is_up "$CAMUNDA_PORT" || MISSING="$MISSING ms-runtime-camunda(porta $CAMUNDA_PORT)"
port_is_up 8081 || MISSING="$MISSING admin/back(porta 8081)"
if [ -n "$MISSING" ]; then
  echo "ERRO: os seguintes servicos nao estao no ar:$MISSING" >&2
  echo "Suba a stack (ex.: ./start-all.sh) e rode este script de novo." >&2
  exit 1
fi
echo "Stack no ar."

echo ""
echo "2/4 Zerando o Camunda (porta $CAMUNDA_PORT) ..."
CAMUNDA_PID=$(lsof -ti tcp:"$CAMUNDA_PORT" 2>/dev/null || true)
if [ -n "$CAMUNDA_PID" ]; then
  echo "  Encerrando processo $CAMUNDA_PID (ms-runtime-camunda) ..."
  kill "$CAMUNDA_PID" 2>/dev/null || true
  for i in 1 2 3 4 5 6 7 8 9 10; do
    port_is_up "$CAMUNDA_PORT" || break
    sleep 1
  done
  port_is_up "$CAMUNDA_PORT" && kill -9 "$CAMUNDA_PID" 2>/dev/null || true
fi
if [ -d "$CAMUNDA_H2_DIR" ]; then
  rm -f "$CAMUNDA_H2_DIR"/process-engine.*
  echo "  H2 do Camunda apagado ($CAMUNDA_H2_DIR)."
fi
echo "  Subindo o ms-runtime-camunda de novo (H2 novo) ..."
( cd "$CAMUNDA_DIR" && nohup ./mvnw -q spring-boot:run >/tmp/ms-runtime-camunda-restart.log 2>&1 & )
waited=0
while ! port_is_up "$CAMUNDA_PORT"; do
  waited=$((waited + 2))
  if [ "$waited" -ge "$CAMUNDA_RESTART_TIMEOUT_SECONDS" ]; then
    echo "ERRO: ms-runtime-camunda nao voltou na porta $CAMUNDA_PORT apos ${CAMUNDA_RESTART_TIMEOUT_SECONDS}s. Veja /tmp/ms-runtime-camunda-restart.log" >&2
    exit 1
  fi
  sleep 2
done
SCRIPT_STARTED_CAMUNDA=1
echo "  ms-runtime-camunda no ar de novo."

echo "  Criando usuario padrao do Camunda (demo/demo) ..."
CAMUNDA_REST="http://localhost:$CAMUNDA_PORT/engine-rest"
EXISTING=$(curl -s -o /dev/null -w '%{http_code}' "$CAMUNDA_REST/user/demo/profile")
if [ "$EXISTING" = "200" ]; then
  echo "  Usuario demo ja existe, seguindo."
else
  curl -sf -X POST "$CAMUNDA_REST/user/create" -H "Content-Type: application/json" -d '{
    "profile": {"id": "demo", "firstName": "Demo", "lastName": "Demo", "email": "demo@localhost"},
    "credentials": {"password": "demo"}
  }' >/dev/null || { echo "ERRO: falha ao criar o usuario demo no Camunda." >&2; exit 1; }
  curl -s -o /dev/null -X POST "$CAMUNDA_REST/group/create" -H "Content-Type: application/json" \
    -d '{"id": "camunda-admin", "name": "camunda-admin", "type": "WORKFLOW"}'
  curl -sf -X PUT "$CAMUNDA_REST/group/camunda-admin/members/demo" >/dev/null || {
    echo "ERRO: falha ao adicionar demo ao grupo camunda-admin." >&2; exit 1; }
  echo "  Usuario demo/demo criado (grupo camunda-admin)."
fi

echo ""
echo "3/4 Limpando e populando \"$PGDATABASE\" ($PGHOST:$PGPORT) com \"$SQLFILE\" ..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQLFILE"
echo "Massa de dados populada."

echo ""
echo "4/4 Publicando as jornadas via API real do admin/back ..."
echo "Autenticando em $API_BASE ..."
LOGIN_RESPONSE=$(curl -sf -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"username\":\"$API_USER\",\"password\":\"$API_PASS\"}") || {
  echo "Nao foi possivel autenticar no admin/back ($API_BASE)." >&2
  exit 1
}
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Nao foi possivel extrair o token de autenticacao da resposta: $LOGIN_RESPONSE" >&2
  exit 1
fi

# POST /journeys/{id}/publish (o atalho generico) SEMPRE cria uma versao DRAFT nova a partir do
# "flow" atual e publica ela — reusar isso aqui faria version_number subir a cada execucao deste
# script (foi o que aconteceu: v1 virava v2, v3...). O endpoint de versao usado abaixo
# (/versions/{versionId}/republish) exige a versao em UNPUBLISHED (e por isso o SQL semeia assim)
# e republica o MESMO version_id/version_number, sem criar nada novo.
ROWS_FILE=$(mktemp)
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -A -c \
  "SELECT journey_id || ' ' || version_id FROM journey_version WHERE version_status = 'UNPUBLISHED';" > "$ROWS_FILE"

OK=0
FAIL=0
# Le de um arquivo (nao de um pipe) de proposito — "| while read" roda o loop numa subshell em sh
# POSIX, o que perderia os incrementos de OK/FAIL assim que o loop terminasse.
while read -r JID VID; do
  [ -z "$JID" ] && continue
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_BASE/journeys/$JID/versions/$VID/republish" \
    -H "Authorization: Bearer $TOKEN")
  if [ "$HTTP_CODE" = "200" ]; then
    OK=$((OK + 1))
    echo "  Publicada $JID (versao $VID)"
  else
    FAIL=$((FAIL + 1))
    echo "  Falha ao publicar $JID (HTTP $HTTP_CODE)"
  fi
done < "$ROWS_FILE"
rm -f "$ROWS_FILE"

echo ""
echo "Publicadas: $OK   Falharam: $FAIL   Total: $((OK + FAIL))"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
