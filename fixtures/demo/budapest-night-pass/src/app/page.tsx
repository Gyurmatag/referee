import { AuthGate } from "@/components/auth-gate";
import { PassBoard } from "@/components/pass-board";

export default function HomePage() {
  return (
    <AuthGate>
      <div className="space-y-2">
        <h1 className="text-xl font-medium tracking-tight">Pass desk</h1>
        <p className="text-sm text-muted-foreground">
          Budapest Build project. Social login at the door. Uses the OpenAI SDK, Groq, ElevenLabs, and Devin.
        </p>
        <PassBoard />
      </div>
    </AuthGate>
  );
}
