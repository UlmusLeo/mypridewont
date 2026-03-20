#!/usr/bin/env bash
set -e

FRESH=false
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=true ;;
  esac
done

if [ "$FRESH" = true ]; then
  echo "Wiping database volume and rebuilding app..."
  docker compose down -v
  docker compose up --build -d
else
  echo "Starting with existing data..."
  docker compose up --build -d
fi

echo ""
echo "Waiting for app to be healthy..."
timeout=60
while [ $timeout -gt 0 ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "App is running at http://localhost:3000"
    exit 0
  fi
  sleep 2
  timeout=$((timeout - 2))
done

echo "App didn't become healthy in time. Check logs with: docker compose logs app"
exit 1
