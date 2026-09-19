import { AuthGate } from "@/components/auth-gate";
import { VoiceInbox } from "@/components/voice-inbox";

export default function HomePage() {
  return (
    <AuthGate>
      <div className="space-y-2">
        <h1 className="text-xl font-medium tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Budapest Build project. Uses the OpenAI SDK, Groq, ElevenLabs, and Devin.
        </p>
        <VoiceInbox />
      </div>
    </AuthGate>
  );
}
