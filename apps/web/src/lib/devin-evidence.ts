export const DEVIN_PLAYBOOKS = [
  {
    macro: "!referee-judge",
    title: "Build and e2e judge",
    href: "https://app.devin.ai/playbooks/playbook-5088bf08a2f943299d9bb0479e57a3e0",
    file: "playbooks/judge-build-e2e.devin.md",
  },
  {
    macro: "!referee-tracks",
    title: "Tracks judge",
    href: "https://app.devin.ai/playbooks/playbook-f995bf6956394bde8faf68fd10cd7b26",
    file: "playbooks/judge-tracks.devin.md",
  },
  {
    macro: "!referee-ci",
    title: "CI fix",
    href: "https://app.devin.ai/playbooks/playbook-30718181af3542a3bfb9e04760013501",
    file: "playbooks/ci-fix.devin.md",
  },
] as const;

export const DEVIN_SESSIONS = [
  {
    title: "Playbook review loop",
    href: "https://app.devin.ai/sessions/272d72a99ce14558ae7bef41a895c7cc",
    note: "Reads the judge playbook, run.sh, and report.json phase loop.",
  },
  {
    title: "Devin-fixed CI",
    href: "https://app.devin.ai/sessions/6ac38e61548e41bfa56203676d180b57",
    note: "Reviews GitHub Actions and opens a PR if CI is actually broken.",
  },
  {
    title: "Parallel session review",
    href: "https://app.devin.ai/sessions/3fb1447054a74fe3b4962af173e1d7ec",
    note: "Links the two sessions above and reviews how build_e2e and tracks run together.",
  },
  {
    title: "Parallel judges PR",
    href: "https://app.devin.ai/sessions/356f322d949e4b28a9ce4f90645beb5a",
    note: "Devin opens the PR that starts build_e2e and tracks together.",
  },
] as const;
