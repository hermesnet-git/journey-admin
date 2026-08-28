#!/bin/bash
# Derruba front, back e os 5 serviços de simulações matando quem estiver ouvindo nas portas conhecidas.

declare -A ports=(
  [5173]=front
  [8081]=back
  [8080]=ms-runtime-camunda
  [5175]=front-mock-integracoes
  [8083]=ms-espec-registry
  [8084]=ms-mock-api-rest
  [8082]=ms-transform-publication
)

for port in "${!ports[@]}"; do
  pids=$(lsof -ti tcp:"$port")
  if [ -n "$pids" ]; then
    echo "Porta $port (${ports[$port]}) -> matando PID(s) $pids"
    kill -9 $pids
  fi
done

read -p "Pressione Enter para fechar..."
