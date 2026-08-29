#!/bin/sh
for PORT in 8086 8087 5176 5177; do
  PID=$(lsof -ti tcp:$PORT)
  if [ -n "$PID" ]; then
    echo "Porta $PORT -> matando PID $PID"
    kill -9 $PID
  fi
done
