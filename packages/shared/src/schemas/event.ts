import { z } from "zod";
import { EventClaimSchema } from "./track";

export const EventSchema = z.object({
  id: z.string(),
  luma_url: z.string().default(""),
  title: z.string(),
  city: z.string().default(""),
  venue: z.string().default(""),
  starts_at: z.string(),
  ends_at: z.string(),
  window_start: z.string(),
  window_end: z.string(),
  reveal_scores: z.boolean().default(false),
  quota_alert: z.boolean().default(false),
});

export const EventPublicSchema = EventSchema.extend({
  submissions: z.number().int().nonnegative().default(0),
  judges_running: z.number().int().nonnegative().default(0),
  wall_enabled: z.boolean().default(true),
  claims: z.array(EventClaimSchema).default([]),
});

export const WallEventSchema = z.object({
  id: z.number().optional(),
  submission_id: z.string(),
  kind: z.string(),
  message: z.string(),
  at: z.string(),
});

export const WallTeamSchema = z.object({
  id: z.string(),
  team_name: z.string(),
  status: z.string(),
  repo_url: z.string().default(""),
  live_url: z.string().nullable().optional(),
  deploy_url: z.string().nullable().optional(),
  phase: z.string().default(""),
  screenshots: z.array(z.string()).default([]),
  created_at: z.string().default(""),
});

export const WallPayloadSchema = z.object({
  event: EventPublicSchema,
  in_use: z.number().int().nonnegative().default(0),
  queued: z.number().int().nonnegative().default(0),
  quota_alert: z.boolean().default(false),
  judging: z.array(z.unknown()).default([]),
  submissions: z.array(z.unknown()).default([]),
  teams: z.array(WallTeamSchema).default([]),
  events: z.array(WallEventSchema).default([]),
});

export const WallSocketMessageSchema = z.object({
  type: z.enum(["snapshot", "event"]),
  at: z.string().optional(),
});

export type EventInfo = z.infer<typeof EventSchema>;
export type EventPublic = z.infer<typeof EventPublicSchema>;
export type WallEvent = z.infer<typeof WallEventSchema>;
export type WallPayload = z.infer<typeof WallPayloadSchema>;
export type WallTeam = z.infer<typeof WallTeamSchema>;
