import type { JudgeReport } from "./schemas/judge-report";
import type {
  ExternalVerdict,
  Override,
  Provenance,
  Review,
  Scorecard,
} from "./schemas/submission";
import type { Rubric } from "./schemas/rubric";

const BUILD_FAIL_PENALTY = 0.15;
const UNTESTABLE_PENALTY = 0.08;

/** How far an outside verdict may sit from the executed evidence before it is called out. */
const VERDICT_AGREEMENT_BAND = 0.15;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function claimScore(result: string): number {
  if (result === "pass") return 1;
  if (result === "partial") return 0.5;
  return 0;
}

function claimsPassRate(report: JudgeReport | undefined): number {
  const claims = report?.claims ?? [];
  if (claims.length === 0) return 0;
  const sum = claims.reduce((acc, c) => acc + claimScore(c.result), 0);
  return sum / claims.length;
}

function trackScore(reports: JudgeReport[], trackId: string): number {
  for (const report of reports) {
    const hit = report.tracks.find(
      (t) => t.track === trackId || t.track.endsWith(trackId),
    );
    if (hit && hit.max > 0) return clamp01(hit.score / hit.max);
  }
  return 0;
}

function securityScore(report: JudgeReport | undefined): number {
  const found = report?.security.secrets_found ?? 0;
  return clamp01(1 - found * 0.25);
}

function dimensionValue(
  source: string,
  reports: JudgeReport[],
  provenance: Provenance | null,
  review: Review | null,
): number {
  const build = reports.find((r) => r.judge === "build_e2e") ?? reports[0];
  switch (source) {
    case "claims_pass_rate":
      return claimsPassRate(build);
    case "provenance.in_window_ratio":
      return clamp01(provenance?.in_window_ratio ?? 0);
    case "tracks.devin_role":
      return trackScore(reports, "devin_role");
    case "review.summary_score":
      return clamp01(review?.summary_score ?? 0);
    case "security":
      return securityScore(build);
    default:
      return 0;
  }
}

export type VerdictAgreement =
  | "supported"
  | "optimistic"
  | "pessimistic"
  | "unknown";

export type VerdictComparison = {
  source: string;
  external: number | null;
  evidence: number | null;
  delta: number | null;
  agreement: VerdictAgreement;
  testedClaims: number;
  untestedClaims: number;
};

/**
 * Compare an outside verdict against what Referee observed when it ran the
 * project. This never changes the score; it reports whether the evidence
 * backs the verdict so a human can decide.
 */
export function compareExternalVerdict(
  verdict: ExternalVerdict | null,
  reports: JudgeReport[],
): VerdictComparison {
  const build = reports.find((r) => r.judge === "build_e2e") ?? reports[0];
  const claims = build?.claims ?? [];
  const tested = claims.filter((c) => c.result !== "untestable");
  // Untestable claims are excluded here so they do not read as failures the
  // outside verdict got wrong. They surface as untestedClaims instead.
  const evidence =
    tested.length === 0
      ? null
      : tested.reduce((acc, c) => acc + claimScore(c.result), 0) / tested.length;

  const max = verdict?.max ?? null;
  const raw = verdict?.score ?? null;
  const external =
    raw === null || max === null || max <= 0 ? null : clamp01(raw / max);

  if (external === null || evidence === null) {
    return {
      source: verdict?.source ?? "",
      external,
      evidence,
      delta: null,
      agreement: "unknown",
      testedClaims: tested.length,
      untestedClaims: claims.length - tested.length,
    };
  }

  const delta = external - evidence;
  let agreement: VerdictAgreement = "supported";
  if (delta > VERDICT_AGREEMENT_BAND) agreement = "optimistic";
  else if (delta < -VERDICT_AGREEMENT_BAND) agreement = "pessimistic";

  return {
    source: verdict?.source ?? "",
    external,
    evidence,
    delta,
    agreement,
    testedClaims: tested.length,
    untestedClaims: claims.length - tested.length,
  };
}

export function confidenceFrom(
  reports: JudgeReport[],
): number {
  if (reports.length === 0) return 0;
  const product = reports.reduce((acc, r) => acc * clamp01(r.confidence), 1);
  let value = Math.min(1, product);
  const build = reports.find((r) => r.judge === "build_e2e") ?? reports[0];
  if (build?.build.status === "failed") {
    value -= BUILD_FAIL_PENALTY;
  }
  const untestable = (build?.claims ?? []).filter(
    (c) => c.result === "untestable",
  ).length;
  value -= UNTESTABLE_PENALTY * untestable;
  return clamp01(value);
}

export function aggregate(input: {
  reports: JudgeReport[];
  provenance: Provenance | null;
  review: Review | null;
  rubric: Rubric;
  overrides?: Override[];
}): Scorecard {
  const overrideByDim = new Map(
    (input.overrides ?? []).map((o) => [o.dimension, o]),
  );
  const dimensions = input.rubric.dimensions.map((dim) => {
    const computed = dimensionValue(
      dim.source,
      input.reports,
      input.provenance,
      input.review,
    );
    const override = overrideByDim.get(dim.id);
    return {
      id: dim.id,
      label: dim.label,
      weight: dim.weight,
      source: dim.source,
      value: override ? clamp01(override.value) : computed,
      overridden: Boolean(override),
      note: override?.note,
    };
  });
  const total = dimensions.reduce((sum, d) => sum + d.value * d.weight, 0);
  return {
    dimensions,
    total,
    confidence: confidenceFrom(input.reports),
  };
}
