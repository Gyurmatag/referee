FROM docker.io/cloudflare/sandbox:0.12.9

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates ffmpeg xvfb postgresql redis-server python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN npm i -g pnpm \
    && npx --yes playwright@1.55.0 install --with-deps chromium

RUN mkdir -p /opt/referee-pw \
    && cd /opt/referee-pw \
    && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --omit=dev --no-audit --no-fund playwright-core@1.55.0

RUN curl -fsSL https://cli.devin.ai/install.sh -o /tmp/i.sh \
    && (bash /tmp/i.sh </dev/null || true) \
    && /root/.local/bin/devin --version

ENV PATH="/root/.local/bin:${PATH}"
ENV DEVIN_PERMISSION_MODE=dangerous

COPY judge/run.sh /judge/run.sh
COPY judge/prompts /judge/prompts
COPY judge/config/devin.config.json /root/.config/devin/config.json

RUN chmod +x /judge/run.sh && mkdir -p /out/evidence /work

EXPOSE 3000 5173 8000 8080
