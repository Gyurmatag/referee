import { z } from "zod";
export { RecipeSchema } from "./run-recipe";
import { JudgeReportSchema, PhaseSchema } from "./judge-report";

export const SubmissionStatusSchema = z.enum([
  "queued",
  "judging",
  "deploying",
  "done",
  "failed",
  "appealed",
]);

export const ClaimInputSchema = z.object({
  claim: z.string().min(1),
});

export const CreateSubmissionSchema = z.object({
  team_name: z.string().min(1),
  repo_url: z
    .string()
    .url()
    .refine(
      (u) => /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(u.replace(/\.git$/, "")),
      "Public GitHub repo URL required",
    ),
  live_url: z.string().url().optional().or(z.literal("")),
  claims: z.array(ClaimInputSchema).max(8).default([]),
  run_hints: z.string().default(""),
  devin_links: z.array(z.string()).default([]),
  display_consent: z.boolean().default(true),
});

export const CommitStorySchema = z.object({
  sha: z.string(),
  at: z.string(),
  author: z.string(),
  is_bot: z.boolean().default(false),
  coauthored_by_devin: z.boolean().default(false),
  additions: z.number().int().default(0),
  deletions: z.number().int().default(0),
});

export const ProvenanceSchema = z.object({
  repo_created_at: z.string().default(""),
  is_fork: z.boolean().default(false),
  parent_repo: z.string().nullable().default(null),
  commits: z.array(CommitStorySchema).default([]),
  in_window_ratio: z.number().min(0).max(1).default(0),
  bot_commit_ratio: z.number().min(0).max(1).default(0),
  coauthor_devin_ratio: z.number().min(0).max(1).default(0),
  devin_prs: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
});

export const DeploymentSchema = z.object({
  method: z.enum(["live_url", "sandbox", "workers", "none"]).default("none"),
  url: z.string().default(""),
  sandbox_url: z.string().default(""),
  sandbox_id: z.string().default(""),
  port: z.number().int().nullable().default(null),
  healthy: z.boolean().default(false),
  last_seen_at: z.string().default(""),
  notes: z.string().default(""),
});

export const ReviewSchema = z.object({
  fork_repo: z.string().default(""),
  pr_url: z.string().default(""),
  review_url: z.string().default(""),
  summary: z.string().default(""),
  summary_score: z.number().min(0).max(1).default(0),
  screenshots: z.array(z.string()).default([]),
});

/**
 * A verdict produced outside Referee, such as the event's own AI judge.
 * Referee never scores with it; it records it so the scorecard can show
 * whether the executed evidence supports it.
 */
export const ExternalVerdictSchema = z.object({
  source: z.string().default(""),
  score: z.number().nullable().default(null),
  max: z.number().positive().nullable().default(null),
  summary: z.string().default(""),
  url: z.string().default(""),
  recorded_at: z.string().default(""),
});

export const JudgeRunSchema = z.object({
  id: z.string(),
  submission_id: z.string(),
  judge: z.string(),
  runner: z.string().default("cli-sandbox"),
  phase: PhaseSchema,
  log_tail: z.string().default(""),
  report: JudgeReportSchema.nullable().default(null),
  transcript_key: z.string().nullable().default(null),
  session_url: z.string().default(""),
  started_at: z.string(),
  finished_at: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
});

export const ScoreDimensionSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number(),
  source: z.string(),
  value: z.number(),
  overridden: z.boolean().default(false),
  note: z.string().optional(),
});

export const ScorecardSchema = z.object({
  dimensions: z.array(ScoreDimensionSchema),
  total: z.number(),
  confidence: z.number().min(0).max(1),
});

export const OverrideSchema = z.object({
  submission_id: z.string(),
  dimension: z.string(),
  value: z.number(),
  note: z.string().default(""),
  by_user: z.string().default(""),
  at: z.string().default(""),
});

export const SubmissionSchema = z.object({
  id: z.string(),
  user_id: z.string().default(""),
  team_name: z.string(),
  repo_url: z.string(),
  live_url: z.string().nullable().default(null),
  claims: z.array(ClaimInputSchema).default([]),
  run_hints: z.string().default(""),
  devin_links: z.array(z.string()).default([]),
  display_consent: z.boolean().default(false),
  head_sha: z.string().default(""),
  status: SubmissionStatusSchema,
  confidence: z.number().nullable().default(null),
  score: ScorecardSchema.nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
  judge_runs: z.array(JudgeRunSchema).default([]),
  provenance: ProvenanceSchema.nullable().default(null),
  deployment: DeploymentSchema.nullable().default(null),
  review: ReviewSchema.nullable().default(null),
  external_verdict: ExternalVerdictSchema.nullable().default(null),
  queue_position: z.number().int().nullable().optional(),
});

export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type Deployment = z.infer<typeof DeploymentSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Scorecard = z.infer<typeof ScorecardSchema>;
export type Override = z.infer<typeof OverrideSchema>;
export type ExternalVerdict = z.infer<typeof ExternalVerdictSchema>;
export type CommitStory = z.infer<typeof CommitStorySchema>;
export type JudgeRun = z.infer<typeof JudgeRunSchema>;
