#!/bin/bash
# Sobe front, back e os 5 serviços de simulações, cada um numa aba.
# Usa iTerm2 se estiver instalado, senão cai no Terminal.app padrão do sistema.
# Apps React: instala node_modules se não existir. Apps Spring Boot: compila antes de rodar.

ROOT="$(cd "$(dirname "$0")" && pwd)"

titles=(front back ms-runtime-camunda front-mock-integracoes ms-espec-registry ms-mock-api-rest ms-transform-publication)
paths=(front back simulacoes/ms-runtime-camunda simulacoes/front-mock-integracoes simulacoes/ms-espec-registry simulacoes/ms-mock-api-rest simulacoes/ms-transform-publication)
types=(react spring spring react spring spring spring)

build_command() {
  local path="$1" type="$2"
  if [ "$type" = "react" ]; then
    echo "cd '$ROOT/$path' && ([ -d node_modules ] || npm install) && npm run dev"
  else
    echo "cd '$ROOT/$path' && ./mvnw compile && ./mvnw spring-boot:run"
  fi
}

escape_for_applescript() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if [ -d "/Applications/iTerm.app" ]; then
  {
    echo 'tell application "iTerm2"'
    echo '  activate'
    echo '  set newWindow to (create window with default profile)'
    for i in "${!titles[@]}"; do
      cmd=$(build_command "${paths[$i]}" "${types[$i]}")
      esc_cmd=$(escape_for_applescript "$cmd")
      if [ "$i" -eq 0 ]; then
        echo '  tell current session of newWindow'
        echo "    write text \"$esc_cmd\""
        echo '  end tell'
      else
        echo '  tell newWindow'
        echo '    set newTab to (create tab with default profile)'
        echo '  end tell'
        echo '  tell current session of newTab'
        echo "    write text \"$esc_cmd\""
        echo '  end tell'
      fi
    done
    echo 'end tell'
  } | osascript -
else
  {
    echo 'tell application "Terminal"'
    echo '  activate'
    for i in "${!titles[@]}"; do
      cmd=$(build_command "${paths[$i]}" "${types[$i]}")
      esc_cmd=$(escape_for_applescript "$cmd")
      if [ "$i" -eq 0 ]; then
        echo "  do script \"$esc_cmd\""
      else
        echo '  tell application "System Events" to keystroke "t" using {command down}'
        echo '  delay 0.3'
        echo "  do script \"$esc_cmd\" in front window"
      fi
    done
    echo 'end tell'
  } | osascript -
fi
