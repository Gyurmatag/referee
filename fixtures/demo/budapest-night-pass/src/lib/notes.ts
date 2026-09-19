import { ElevenLabsClient } from "elevenlabs";
import Groq from "groq-sdk";
import OpenAI from "openai";

export type GateNote = {
  source: "openai" | "groq" | "fixture";
  text: string;
  voice: "elevenlabs-ready" | "elevenlabs-not-configured";
};

function env(name: string) {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

function voiceStatus(): GateNote["voice"] {
  return env("ELEVENLABS_API_KEY") || env("NEXT_PUBLIC_ELEVENLABS_API_KEY")
    ? "elevenlabs-ready"
    : "elevenlabs-not-configured";
}

export function createElevenLabs() {
  const apiKey = env("ELEVENLABS_API_KEY");
  return apiKey ? new ElevenLabsClient({ apiKey }) : null;
}

const PROMPT = "One sentence for a Margaret Island night-pass desk in Budapest. Calm, specific, no marketing.";

export async function draftGateNote(): Promise<GateNote> {
  const openaiKey = env("OPENAI_API_KEY") || env("NEXT_PUBLIC_OPENAI_API_KEY");
  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
    const out = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: PROMPT,
    });
    return { source: "openai", text: out.output_text, voice: voiceStatus() };
  }

  const groqKey = env("GROQ_API_KEY");
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
    const out = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: PROMPT }],
    });
    return { source: "groq", text: out.choices[0]?.message?.content ?? "", voice: voiceStatus() };
  }

  return {
    source: "fixture",
    text: "Hold the Hajóállomás line until the 23:40 boat clears. Built with the OpenAI SDK, Groq, and ElevenLabs.",
    voice: voiceStatus(),
  };
}
