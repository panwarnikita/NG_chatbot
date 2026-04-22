#!/usr/bin/env bash
# Deploy backend to EC2: pull latest code, install deps, reload gunicorn.
# Usage: EC2_HOST=<public-ip-or-dns> ./scripts/deploy-backend.sh
# Optional: SSH_KEY_PATH=./.secrets/ng_chatbot_deploy
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${PROJECT_ROOT}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${PROJECT_ROOT}/.env"
  set +a
fi

EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST:?EC2_HOST is required (e.g. EC2_HOST=3.6.19.86)}"
APP_DIR="${APP_DIR:-/home/ubuntu/ng-chatbot}"
BRANCH="${DEPLOY_BRANCH:-main}"
SSH_KEY_PATH="${SSH_KEY_PATH:-./.secrets/ng_chatbot_deploy}"

if [[ "${SSH_KEY_PATH}" == ./* ]]; then
  SSH_KEY_PATH="${PROJECT_ROOT}/${SSH_KEY_PATH#./}"
fi

if [ ! -f "${SSH_KEY_PATH}" ]; then
  echo "ERROR: SSH private key not found at ${SSH_KEY_PATH}" >&2
  echo "Set SSH_KEY_PATH or create key: ssh-keygen -t ed25519 -C \"ng-chatbot-deploy\" -f ${SSH_KEY_PATH}" >&2
  exit 1
fi

echo "Deploying ${BRANCH} to ${EC2_USER}@${EC2_HOST}:${APP_DIR}"

ssh -i "${SSH_KEY_PATH}" "${EC2_USER}@${EC2_HOST}" APP_DIR="${APP_DIR}" BRANCH="${BRANCH}" bash -s <<'REMOTE'
set -euo pipefail
cd "${APP_DIR}"
git fetch --all --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"
# shellcheck disable=SC1091
source backend/venv/bin/activate
pip install -q -r backend/requirements.txt
# Reload gunicorn workers without downtime. Master stays, workers re-fork and
# re-read .env via python-dotenv's load_dotenv() at import time.
MASTER_PID=$(pgrep -f "gunicorn.*app:app" | head -n1 || true)
if [ -z "${MASTER_PID}" ]; then
  echo "ERROR: gunicorn master not found — cannot reload." >&2
  exit 1
fi
kill -HUP "${MASTER_PID}"
echo "Reloaded gunicorn master ${MASTER_PID}."
REMOTE

echo "Deploy complete."
