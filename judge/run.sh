#!/usr/bin/env bash
set -uo pipefail
JUDGE="$1"
export DEVIN_PERMISSION_MODE=dangerous
mkdir -p /out/evidence
[ -f /root/.local/share/devin/credentials.toml ] || { echo '{"phase":"failed","summary":"no credentials"}' > /out/report.json; exit 2; }
echo "{\"judge\":\"$JUDGE\",\"phase\":\"starting\"}" > /out/report.json
cd /work/repo
devin -p --prompt-file "/judge/prompts/${JUDGE}.md" --permission-mode dangerous --respect-workspace-trust false \
      --export /out/transcript.json ${DEVIN_MODEL:+--model "$DEVIN_MODEL"} 2>&1 | tee /out/stdout.log
code=${PIPESTATUS[0]}
if ! grep -q '"phase": *"\(done\|failed\)"' /out/report.json 2>/dev/null; then
  echo "{\"judge\":\"$JUDGE\",\"phase\":\"failed\",\"summary\":\"agent exited ($code) without final report\"}" > /out/report.json
fi
exit $code
