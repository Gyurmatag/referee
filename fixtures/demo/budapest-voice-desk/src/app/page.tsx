import { VoiceInbox } from "@/components/voice-inbox";

export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-medium tracking-tight">Inbox</h1>
      <p className="text-sm text-muted-foreground">
        Budapest Build project. Uses the OpenAI SDK, Groq inference, and ElevenLabs voice.
      </p>
      <VoiceInbox />
    </div>
  );
}
