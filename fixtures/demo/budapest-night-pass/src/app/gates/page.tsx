import { AuthGate } from "@/components/auth-gate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const gates = [
  { id: "Margit híd", load: "Open", note: "Main walk-up from Pest." },
  { id: "Hajóállomás", load: "Held", note: "Wait for the 23:40 boat." },
  { id: "Zenekert", load: "Open", note: "Quiet after midnight." },
];

export default function GatesPage() {
  return (
    <AuthGate>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Gates</h1>
          <p className="text-sm text-muted-foreground">Three island doors the desk is watching tonight.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {gates.map((gate) => (
            <Card key={gate.id}>
              <CardHeader>
                <CardTitle>{gate.id}</CardTitle>
                <CardDescription>{gate.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{gate.load}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AuthGate>
  );
}
