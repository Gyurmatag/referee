export {
  PhaseSchema,
  JudgeReportSchema,
  RecipeSchema,
  parseJudgeReport,
  type Phase,
  type JudgeReport,
  type Recipe,
  type ClaimVerdict,
  type TrackVerdict,
  IntegritySchema,
  IntegrityFindingSchema,
  type Integrity,
  type IntegrityFinding,
} from "./schemas/judge-report";
export { type RunRecipe } from "./schemas/run-recipe";
export {
  RubricSchema,
  RubricDimensionSchema,
  DEFAULT_RUBRIC,
  rubricWeightsSum,
  type Rubric,
  type RubricDimension,
} from "./schemas/rubric";
export {
  TrackSchema,
  TracksConfigSchema,
  EventClaimSchema,
  DEFAULT_TRACKS,
  claimsFromTracks,
  type Track,
  type TracksConfig,
  type EventClaim,
} from "./schemas/track";
export {
  EventSchema,
  EventPublicSchema,
  WallEventSchema,
  WallPayloadSchema,
  WallTeamSchema,
  type EventInfo,
  type EventPublic,
  type WallEvent,
  type WallPayload,
  type WallTeam,
} from "./schemas/event";
export {
  SubmissionSchema,
  CreateSubmissionSchema,
  SubmissionStatusSchema,
  ProvenanceSchema,
  DeploymentSchema,
  ReviewSchema,
  JudgeRunSchema,
  ScorecardSchema,
  OverrideSchema,
  ExternalVerdictSchema,
  type Submission,
  type SubmissionStatus,
  type Provenance,
  type Deployment,
  type Review,
  type Scorecard,
  type Override,
  type CommitStory,
  type JudgeRun,
  type ExternalVerdict,
} from "./schemas/submission";
export { parseDemoLogin, mergeDemoLogin, redactDemoLogin, type DemoLogin } from "./demo-login";
export {
  aggregate,
  confidenceFrom,
  compareExternalVerdict,
  type VerdictAgreement,
  type VerdictComparison,
} from "./score";

import done from "./fixtures/submission.done.json";
import failed from "./fixtures/submission.failed.json";
import running from "./fixtures/submission.running.json";

export const fixtures = {
  done,
  failed,
  running,
};
