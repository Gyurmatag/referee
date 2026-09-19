import Groq from "groq-sdk";
import OpenAI from "openai";

export type GateNote = {
  source: "openai" | "groq" | "fixture";
  text: string;
};

const PROMPT = "One sentence for a Margaret Island night-pass desk in Budapest. Calm, specific, no marketing.";

export async function draftGateNote(): Promise<GateNote> {
  const openaiKey =
    (typeof process !== "undefined" && (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)) || "";
  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
    const out = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: PROMPT,
    });
    return { source: "openai", text: out.output_text };
  }

  const groqKey = (typeof process !== "undefined" && process.env.GROQ_API_KEY) || "";
  if (groqKey) {
    const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
    const out = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: PROMPT }],
    });
    return { source: "groq", text: out.choices[0]?.message?.content ?? "" };
  }

  return {
    source: "fixture",
    text: "Hold the Hajóállomás line until the 23:40 boat clears. Built with the OpenAI SDK and Groq.",
  };
}
