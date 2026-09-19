import { ElevenLabsClient } from "elevenlabs";
import Groq from "groq-sdk";
import OpenAI from "openai";

export type ScanResult = {
  source: "openai" | "groq" | "fixture";
  text: string;
  voice: "elevenlabs-ready" | "elevenlabs-not-configured";
};

function env(name: string) {
  if (typeof process === "undefined") return "";
  return process.env[name] ?? "";
}

function voiceStatus(): ScanResult["voice"] {
  return env("ELEVENLABS_API_KEY") || env("NEXT_PUBLIC_ELEVENLABS_API_KEY")
    ? "elevenlabs-ready"
    : "elevenlabs-not-configured";
}

export function createOpenAI(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export function createElevenLabs() {
  const apiKey = env("ELEVENLABS_API_KEY");
  return apiKey ? new ElevenLabsClient({ apiKey }) : null;
}

export async function runScan(): Promise<ScanResult> {
  const openaiKey = env("OPENAI_API_KEY") || env("NEXT_PUBLIC_OPENAI_API_KEY");
  const groqKey = env("GROQ_API_KEY") || env("NEXT_PUBLIC_GROQ_API_KEY");
  const prompt = "Name three late-night BKK connections a visitor can walk to from Impact Hub Budapest.";

  if (openaiKey) {
    const openai = createOpenAI(openaiKey);
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

  return {
    source: "fixture",
    text: "4-6 tram, M2 at Astoria, night bus 931. Built with the OpenAI SDK, Groq, and ElevenLabs.",
    voice: voiceStatus(),
  };
}
