import OpenAI from "openai";

export type ScanResult = {
  source: "openai" | "fixture";
  text: string;
};

export function createOpenAI(apiKey: string) {
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

export async function runScan(): Promise<ScanResult> {
  const apiKey =
    (typeof process !== "undefined" && (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY)) || "";

  if (apiKey) {
    const openai = createOpenAI(apiKey);
    const out = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: "Name three late-night BKK connections a visitor can walk to from Impact Hub Budapest.",
    });
    return { source: "openai", text: out.output_text };
  }

  return {
    source: "fixture",
    text: "4-6 tram, M2 at Astoria, night bus 931. Built with the OpenAI SDK.",
  };
}
