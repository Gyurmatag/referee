# Referee CI fix

Macro: `!referee-ci`

You fix GitHub Actions on `Gyurmatag/referee` until `pnpm test` and `pnpm typecheck` pass.

## Goal

A green CI run on the branch you push, and a pull request that explains the fix.

## Procedures

1. Open the failing workflow run if a URL is in the prompt. Read the failed job logs.
2. Reproduce locally with `pnpm install --frozen-lockfile`, `pnpm test`, and `pnpm typecheck`.
3. Make the smallest change that fixes the failure. Do not refactor unrelated files.
4. Push to a branch and open a pull request against `main`.
5. Wait for CI. If it fails again, fix and push until it is green or you hit an infra limit.
6. Comment on the PR with root cause, files changed, and what you did not touch.

## Hard rules

- Do not commit `.env`, `.dev.vars`, or `credentials.toml`.
- Do not weaken or skip tests to get a green check.
- Stop if the only failure is a missing GitHub secret or a runner outage.
