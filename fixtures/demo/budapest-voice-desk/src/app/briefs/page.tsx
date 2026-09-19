import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { seedBriefs } from "@/lib/tickets";

export default function BriefsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Briefs</h1>
        <p className="text-sm text-muted-foreground">Spoken and drafted civic replies from the desk.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent briefs</CardTitle>
          <CardDescription>Drafted with the OpenAI SDK or Groq, spoken with ElevenLabs when a key is set.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seedBriefs.map((brief) => (
                <TableRow key={brief.id}>
                  <TableCell className="font-medium">{brief.id}</TableCell>
                  <TableCell>
                    <div>{brief.topic}</div>
                    <p className="max-w-xl text-xs leading-5 text-muted-foreground">{brief.text}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{brief.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
