import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { scanLog } from "@/lib/routes";

export default function ScansPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Scans</h1>
        <p className="text-sm text-muted-foreground">Recent OpenAI SDK notes for the night board.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scan log</CardTitle>
          <CardDescription>Each row is a short night-service summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanLog.map((scan) => (
                <TableRow key={scan.id}>
                  <TableCell className="font-medium">{scan.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scan.at}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xl whitespace-normal">{scan.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
