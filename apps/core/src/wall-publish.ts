import {
  getEvent,
  listRecentEvents,
  listSubmissions,
  type CoreEnv,
} from "./db/queries.js";
import { broadcastWall } from "./do/wall.js";
import { publicEventFrom, wallPayloadFrom } from "./wall.js";

export async function assembleWall(
  env: CoreEnv,
  slots: { inUse: number; queued: number },
  eventId = "default",
) {
  const event = await getEvent(env.DB, eventId);
  const consented = (await listSubmissions(env.DB, { consented: true, eventId })).map((s) =>
    event.reveal_scores
      ? s
      : {
          ...s,
          score: null,
          confidence: null,
        },
  );
  return wallPayloadFrom({
    event: publicEventFrom({
      ...event,
      submissions: consented.length,
      judges_running: slots.inUse,
    }),
    in_use: slots.inUse,
    queued: slots.queued,
    quota_alert: event.quota_alert,
    submissions: consented,
    events: await listRecentEvents(env.DB, 50, eventId),
  });
}

export async function publishWall(
  env: CoreEnv,
  slots: { inUse: number; queued: number },
): Promise<void> {
  try {
    await broadcastWall(env, await assembleWall(env, slots));
  } catch {
    /* live board is best-effort */
  }
}
