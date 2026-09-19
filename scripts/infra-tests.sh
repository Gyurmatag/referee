#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Colima on arm64: do not pass --platform linux/amd64 (create then tries to pull
# and fails). Do not use `docker run` if the CLI attempts a Hub pull; use
# `docker create --pull never` + start. Override the sandbox entrypoint.

CREDS="${DEVIN_CREDENTIALS_TOML_PATH:-$HOME/.local/share/devin/credentials.toml}"
IMAGE="${REFEREE_JUDGE_IMAGE:-referee-judge:latest}"

run_in_image() {
  local name="$1"
  local script="$2"
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker create --pull never --name "$name" --entrypoint bash \
    -e DEVIN_MODEL="${DEVIN_MODEL:-swe-2-medium}" \
    "$IMAGE" -lc "$script"
  if [[ -f "$CREDS" ]]; then
    docker cp "$CREDS" "$name:/tmp/credentials.toml"
  fi
  docker start -a "$name"
}

echo "== T1 image builds and CLI runs =="
docker build -t referee-judge -f judge/Dockerfile .
docker rm -f referee-t1 >/dev/null 2>&1 || true
docker create --pull never --name referee-t1 --entrypoint /root/.local/bin/devin "$IMAGE" --version
docker start -a referee-t1
docker rm -f referee-t1 >/dev/null

if [[ ! -f "$CREDS" ]]; then
  echo "T2/T3 skipped: no credentials at $CREDS"
  exit 0
fi

echo "== T2 headless run =="
run_in_image referee-t2 '
mkdir -p /root/.local/share/devin
cp /tmp/credentials.toml /root/.local/share/devin/credentials.toml
cd /tmp && git init -q t && cd t
devin -p "Write the single word OK to /tmp/ok.txt and stop." \
  --permission-mode dangerous --respect-workspace-trust false \
  --export /tmp/tr.json ${DEVIN_MODEL:+--model "$DEVIN_MODEL"}
echo EXIT:$?
echo "--- ok.txt ---"
cat /tmp/ok.txt
echo
echo "--- transcript ---"
ls -la /tmp/tr.json
'
docker rm -f referee-t2 >/dev/null

echo "== T3 report contract =="
run_in_image referee-t3 '
mkdir -p /out /root/.local/share/devin
cp /tmp/credentials.toml /root/.local/share/devin/credentials.toml
git init -q /tmp/t && cd /tmp/t
devin -p "Write {\"phase\":\"done\",\"summary\":\"hello\"} to /out/report.json and stop." \
  --permission-mode dangerous --respect-workspace-trust false \
  --export /tmp/tr.json ${DEVIN_MODEL:+--model "$DEVIN_MODEL"}
echo EXIT:$?
echo "--- report ---"
cat /out/report.json
echo
'
mkdir -p /tmp/referee-t3-out
docker cp referee-t3:/out/report.json /tmp/referee-t3-out/report.json
docker rm -f referee-t3 >/dev/null
