import { z } from "zod";

export const PhaseSchema = z.enum([
  "starting",
  "installing",
  "building",
  "running",
  "testing",
  "done",
  "failed",
]);

export const BuildStatusSchema = z.enum(["ok", "failed", "skipped"]);
export const ClaimResultSchema = z.enum(["pass", "fail", "partial", "untestable"]);
export const DeployMethodSchema = z.enum(["live_url", "sandbox", "workers", "none"]);
export const JudgeKindSchema = z.enum(["build_e2e", "tracks"]);

export const RecipeSchema = z.object({
  install: z.string().default(""),
  build: z.string().default(""),
  start: z.string().default(""),
  port: z.number().int().positive().default(3000),
  env: z.record(z.string(), z.string()).default({}),
  needs_db: z.boolean().default(false),
  notes: z.string().default(""),
});

export const ClaimVerdictSchema = z.object({
  claim: z.string().default(""),
  test: z.string().default(""),
  result: ClaimResultSchema.default("untestable"),
  evidence: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

export const TrackVerdictSchema = z.object({
  track: z.string().default(""),
  score: z.number().default(0),
  max: z.number().default(5),
  evidence: z.array(z.string()).default([]),
  notes: z.string().default(""),
});

/** Text in a submitted repo that tries to steer a judge rather than describe the project. */
export const IntegrityFindingSchema = z.object({
  file: z.string().default(""),
  line: z.number().int().nonnegative().default(0),
  excerpt: z.string().default(""),
  why: z.string().default(""),
});

export const IntegritySchema = z.object({
  injection_found: z.number().int().nonnegative().default(0),
  findings: z.array(IntegrityFindingSchema).default([]),
  notes: z.string().default(""),
});

export const JudgeReportSchema = z
  .object({
    judge: JudgeKindSchema.optional(),
    phase: PhaseSchema,
    build: z
      .object({
        status: BuildStatusSchema.default("skipped"),
        notes: z.string().default(""),
      })
      .default({ status: "skipped", notes: "" }),
    recipe: RecipeSchema.default({
      install: "",
      build: "",
      start: "",
      port: 3000,
      env: {},
      needs_db: false,
      notes: "",
    }),
    deploy: z
      .object({
        url: z.string().default(""),
        method: DeployMethodSchema.default("none"),
        notes: z.string().default(""),
      })
      .default({ url: "", method: "none", notes: "" }),
    claims: z.array(ClaimVerdictSchema).default([]),
    tracks: z.array(TrackVerdictSchema).default([]),
    security: z
      .object({
        secrets_found: z.number().int().nonnegative().default(0),
        notes: z.string().default(""),
      })
      .default({ secrets_found: 0, notes: "" }),
    integrity: IntegritySchema.default({
      injection_found: 0,
      findings: [],
      notes: "",
    }),
    confidence: z.number().min(0).max(1).default(0),
    summary: z.string().default(""),
  })
  .passthrough();

export type Phase = z.infer<typeof PhaseSchema>;
export type JudgeReport = z.infer<typeof JudgeReportSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type ClaimVerdict = z.infer<typeof ClaimVerdictSchema>;
export type TrackVerdict = z.infer<typeof TrackVerdictSchema>;
export type Integrity = z.infer<typeof IntegritySchema>;
export type IntegrityFinding = z.infer<typeof IntegrityFindingSchema>;

export function parseJudgeReport(input: unknown): {
  success: boolean;
  report: JudgeReport | null;
  error: string | null;
} {
  const parsed = JudgeReportSchema.safeParse(input);
  if (parsed.success) {
    return { success: true, report: parsed.data, error: null };
  }
  const loose = z
    .object({ phase: PhaseSchema })
    .passthrough()
    .safeParse(input);
  if (loose.success) {
    const withDefaults = JudgeReportSchema.safeParse({
      ...loose.data,
      phase: loose.data.phase,
    });
    if (withDefaults.success) {
      return { success: true, report: withDefaults.data, error: null };
    }
  }
  return {
    success: false,
    report: null,
    error: parsed.error.issues.map((i) => i.message).join("; "),
  };
}
