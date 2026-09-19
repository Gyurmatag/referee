# Referee

A live hackathon judge. A team submits a public GitHub repo. Devin clones it in an isolated Cloudflare sandbox, checks sponsor claims, deploys an empty live URL to `cfi-ops.workers.dev`, and scores the work on a WebSocket wall.

Live: https://referee-web.cfi-ops.workers.dev

## Judge login

This account is public on purpose so a stranger can open admin and participant screens. It is not a leaked production key.

- URL: https://referee-web.cfi-ops.workers.dev/login
- Email: `judge@referee.dev`
- Password: `devin-admin`
- Roles: Gyurmatag, organizer and participant

Then: Events → Budapest Build → Settings (admin) or Submit work (participant). Wall and `/presentation` also work without login.

## What you can do

- Submit a repo, claims, optional live URL, demo login, and `KEY=value` team secrets
- Leave the live URL empty and Devin deploys the app
- Watch each team on the wall as clone, build, review, and score finish
- Take over the isolated browser when a team used Google or GitHub login
- Change the rubric on the admin page

## Repo

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js app (events, submit, admin, wall, login) |
| `apps/core` | Cloudflare Worker (D1, R2, Durable Objects, Devin sandbox) |
| `packages/shared` | Zod contracts and score helpers |
| `judge/` | Devin CLI playbook (`run.sh`, prompts) |
| `fixtures/demo/` | Three sample teams |

## Local

Needs Node 22+ and pnpm 10.

```bash
git clone https://github.com/Gyurmatag/referee.git
cd referee
corepack enable
pnpm install
cp apps/core/.dev.vars.example apps/core/.dev.vars
cp apps/web/.env.example apps/web/.env.local
```

Fill names only from the example files. Required for a full local judge run: `INTERNAL_API_KEY`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `DEVIN_CREDENTIALS_TOML`. Do not commit those files. `.gitignore` already blocks `.env*`, `.dev.vars`, and `*.toml`.

```bash
pnpm dev:core    # :8787
pnpm dev:web     # :3000
```

Open http://localhost:3000/login with the same judge email and password.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm lint` runs the typecheck. Web Playwright specs live under `apps/web/e2e`.

## Team secrets

On Submit, paste one `KEY=value` per line. Devin writes `.env` / `.dev.vars` in the sandbox and binds Worker secrets. Values are stored off the wall.

## Devin

The judge is a real Devin CLI session (`apps/core/src/runner/cli-sandbox.ts`, `judge/run.sh`). The playbook is `apps/core/src/runner/build-e2e-prompt.ts`. Devin writes `/out/report.json` after each phase. That is the review loop.
