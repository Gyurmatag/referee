"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { draftGateNote, type GateNote } from "@/lib/notes";
import { wristbands } from "@/lib/passes";
import { usePassSession } from "@/lib/auth-session";

const statusLabel = {
  ready: "Ready",
  inside: "Inside",
  held: "Held",
} as const;

export function PassBoard() {
  const session = usePassSession();
  const [note, setNote] = useState<GateNote | null>(null);
  const [pending, setPending] = useState(false);

  async function draft() {
    setPending(true);
    setNote(await draftGateNote());
    setPending(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tonight on the island</CardTitle>
          <CardDescription>
            Signed in as {session && session !== undefined ? session.name : "desk"} with{" "}
            {session && session !== undefined ? session.method : "social"}. Wristbands for the Margaret gates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pass</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Gate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wristbands.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.id}</TableCell>
                  <TableCell>{row.guest}</TableCell>
                  <TableCell>{row.gate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabel[row.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Gate note</CardTitle>
          <CardDescription>Drafted with the OpenAI SDK, or Groq if that key is set.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" disabled={pending} onClick={() => void draft()}>
            {pending ? "Drafting" : "Draft note"}
          </Button>
          {note ? (
            <p className="text-sm leading-6">
              <Badge variant="outline" className="mr-2">
                {note.source}
              </Badge>
              {note.text}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No note yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
