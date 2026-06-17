#!/usr/bin/env bash
set -euo pipefail

WEB_REPO="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_REPO="${1:-/Users/duc/Workspaces/giavico_service}"

git -C "$SERVICE_REPO" apply --check "$WEB_REPO/docs/giavico-service-rnd-integration.patch"
if [ -e "$SERVICE_REPO/rnd-document-service" ]; then
  echo "rnd-document-service already exists in $SERVICE_REPO" >&2
  exit 1
fi
cp -R "$WEB_REPO/integrations/giavico_service/rnd-document-service" "$SERVICE_REPO/rnd-document-service"
git -C "$SERVICE_REPO" apply "$WEB_REPO/docs/giavico-service-rnd-integration.patch"

echo "R&D document service installed in $SERVICE_REPO"
