import { z } from "zod";

export const TrackDetectorsSchema = z
  .object({
    files: z.array(z.string()).optional(),
    deps: z.array(z.string()).optional(),
    commit_authors: z.array(z.string()).optional(),
    trailers: z.array(z.string()).optional(),
    readme_terms: z.array(z.string()).optional(),
    env: z.array(z.string()).optional(),
  })
  .passthrough();

export const TrackSchema = z.object({
  id: z.string(),
  sponsor: z.string().default(""),
  label: z.string(),
  claim: z.string().default(""),
  rubric: z.string().default(""),
  detectors: TrackDetectorsSchema.default({}),
});

export const EventClaimSchema = z.object({
  id: z.string(),
  sponsor: z.string(),
  claim: z.string(),
});

export const TracksConfigSchema = z.object({
  tracks: z.array(TrackSchema),
});

export const DEFAULT_TRACKS: z.infer<typeof TracksConfigSchema> = {
  tracks: [
    {
      id: "openai",
      sponsor: "OpenAI",
      label: "Used the OpenAI SDK",
      claim: "Used the OpenAI SDK",
      rubric:
        "Score 0-5. Real OpenAI SDK or Responses/Chat Completions calls in load-bearing code score high. Mentions only score low.",
      detectors: {
        deps: ["openai", "@openai/agents"],
        files: ["package.json"],
        readme_terms: ["openai", "gpt-"],
        env: ["OPENAI_API_KEY"],
      },
    },
    {
      id: "elevenlabs",
      sponsor: "ElevenLabs",
      label: "Used ElevenLabs voice",
      claim: "Used ElevenLabs voice",
      rubric:
        "Score 0-5. Real ElevenLabs TTS/STT or Agents SDK use scores high. Logo-only mentions score low.",
      detectors: {
        deps: ["elevenlabs", "@elevenlabs/elevenlabs-js", "@elevenlabs/client"],
        readme_terms: ["elevenlabs", "eleven labs"],
        env: ["ELEVENLABS_API_KEY", "ELEVEN_API_KEY"],
      },
    },
    {
      id: "groq",
      sponsor: "Groq",
      label: "Used Groq inference",
      claim: "Used Groq inference",
      rubric:
        "Score 0-5. groq-sdk or Groq OpenAI-compatible client in the request path scores high.",
      detectors: {
        deps: ["groq-sdk"],
        readme_terms: ["groq"],
        env: ["GROQ_API_KEY"],
      },
    },
    {
      id: "devin_role",
      sponsor: "Cognition",
      label: "Cognition Devin API used",
      claim: "Cognition Devin API used",
      rubric:
        "Score 0-5. Real Devin API or session use in load-bearing work scores high. Decorative mentions score low. Use commit authorship, Co-Authored-By trailers, Devin PRs, session links, and whether tests or features depend on Devin-written code.",
      detectors: {
        commit_authors: ["devin-ai-integration[bot]"],
        trailers: ["Co-Authored-By: Devin"],
        readme_terms: ["devin"],
      },
    },
  ],
};

export function claimsFromTracks(
  tracks: z.infer<typeof TracksConfigSchema>,
): z.infer<typeof EventClaimSchema>[] {
  return tracks.tracks.map((track) => ({
    id: track.id,
    sponsor: track.sponsor,
    claim: track.claim || track.label,
  }));
}

export type Track = z.infer<typeof TrackSchema>;
export type TracksConfig = z.infer<typeof TracksConfigSchema>;
export type EventClaim = z.infer<typeof EventClaimSchema>;
