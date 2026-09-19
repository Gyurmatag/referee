import { RadarBoard } from "@/components/radar-board";

export default function HomePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-medium tracking-tight">Network</h1>
      <p className="text-sm text-muted-foreground">Uses the OpenAI SDK to scan late-night walk-up connections.</p>
      <RadarBoard />
    </div>
  );
}
