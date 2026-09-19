import OpenAI from "openai";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "elevenlabs";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const eleven = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

export async function draftBrief(topic) {
  if (openai) {
    const out = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Write a 40-word civic brief about: ${topic}`,
    });
    return { source: "openai", text: out.output_text };
  }
  if (groq) {
    const out = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: `Write a 40-word civic brief about: ${topic}` }],
    });
    return { source: "groq", text: out.choices[0]?.message?.content ?? "" };
  }
  return {
    source: "fixture",
    text: `${topic}. OpenAI SDK, Groq, and ElevenLabs are wired; add keys to speak the brief.`,
    voice: eleven ? "elevenlabs-ready" : "elevenlabs-not-configured",
  };
}
