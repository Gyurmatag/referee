import OpenAI from "openai";

export function createOpenAI(apiKey) {
  return new OpenAI({ apiKey });
}
