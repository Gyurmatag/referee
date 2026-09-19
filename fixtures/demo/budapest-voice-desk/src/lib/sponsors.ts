import OpenAI from "openai";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "elevenlabs";

export type Brief = {
  source: "openai" | "groq" | "fixture";
  text: string;
  voice: "elevenlabs-ready" | "elevenlabs-not-configured";
};

function env(name: string) {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

function voiceStatus(): Brief["voice"] {
  return env("ELEVENLABS_API_KEY") || env("NEXT_PUBLIC_ELEVENLABS_API_KEY")
    ? "elevenlabs-ready"
    : "elevenlabs-not-configured";
}

export function createElevenLabs() {
  const apiKey = env("ELEVENLABS_API_KEY");
  return apiKey ? new ElevenLabsClient({ apiKey }) : null;
}

export async function draftBrief(topic: string): Promise<Brief> {
  const openaiKey = env("OPENAI_API_KEY") || env("NEXT_PUBLIC_OPENAI_API_KEY");
  const groqKey = env("GROQ_API_KEY") || env("NEXT_PUBLIC_GROQ_API_KEY");
  const prompt = `Write a 40-word civic brief about: ${topic}`;

  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
    const out = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
    return { source: "openai", text: out.output_text, voice: voiceStatus() };
  }

  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
    const out = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    });
    return {
      source: "groq",
      text: out.choices[0]?.message?.content ?? "",
      voice: voiceStatus(),
    };
  }

  const eleven = createElevenLabs();
  return {
    source: "fixture",
    text: `${topic}. Keep the 4-6 tram as the night spine and send Impact Hub walk-ups to M2 at Astoria. OpenAI SDK, Groq, and ElevenLabs are wired; add keys to speak the brief.`,
    voice: eleven ? "elevenlabs-ready" : voiceStatus(),
  };
}
