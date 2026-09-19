import { AuthGate } from "@/components/auth-gate";
import { RadarBoard } from "@/components/radar-board";

export default function HomePage() {
  return (
    <AuthGate>
      <div className="space-y-2">
        <h1 className="text-xl font-medium tracking-tight">Network</h1>
        <p className="text-sm text-muted-foreground">
          Uses the OpenAI SDK, Groq, ElevenLabs, and Devin to scan late-night walk-up connections.
        </p>
        <RadarBoard />
      </div>
    </AuthGate>
  );
}
