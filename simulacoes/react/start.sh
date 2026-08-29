#!/bin/sh
# Abre uma aba do Terminal.app por serviço (mesmo espírito do start-all.bat/wt.exe do Windows) —
# cada aba verifica a instalação (node_modules pro React, `mvnw compile` pro Spring) antes de subir.
ROOT="$(cd "$(dirname "$0")" && pwd)"

run_spring() {
  osascript -e "tell application \"Terminal\" to do script \"cd '$1' && ./mvnw compile && ./mvnw spring-boot:run\""
}

run_react() {
  osascript -e "tell application \"Terminal\" to do script \"cd '$1' && [ -d node_modules ] || npm install; npm run dev\""
}

run_spring "$ROOT/bff-canal-web"
sleep 1
run_spring "$ROOT/bff-canal-app"
sleep 1
run_react "$ROOT/canal-web"
sleep 1
run_react "$ROOT/canal-app"
