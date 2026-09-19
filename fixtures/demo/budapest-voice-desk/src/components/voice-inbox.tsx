"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { draftBrief, type Brief } from "@/lib/sponsors";
import { tickets, type Ticket, type TicketStatus } from "@/lib/tickets";

const statusLabel: Record<TicketStatus, string> = {
  queued: "Queued",
  drafting: "Drafting",
  spoken: "Spoken",
};

export function VoiceInbox() {
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [topic, setTopic] = useState("BKK night service on the 4-6 tram");
  const [pending, setPending] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);

  const rows = useMemo(
    () => tickets.filter((ticket) => filter === "all" || ticket.status === filter),
    [filter],
  );
  const openTicket = tickets.find((ticket) => ticket.id === openId) ?? null;

  async function onDraft(nextTopic = topic) {
    setTopic(nextTopic);
    setPending(true);
    try {
      setBrief(await draftBrief(nextTopic));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="In queue" value="2" hint="Voice tickets waiting" />
        <Stat label="Spoken tonight" value="6" hint="ElevenLabs briefs" />
        <Stat label="Avg handle" value="3:20" hint="OpenAI + Groq draft" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Civic voice tickets at Impact Hub</CardDescription>
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="drafting">Drafting</SelectItem>
                <SelectItem value="spoken">Spoken</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Wait</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer" onClick={() => setOpenId(ticket.id)}>
                    <TableCell>
                      <div className="font-medium">{ticket.caller}</div>
                      <div className="text-xs text-muted-foreground">{ticket.id}</div>
                    </TableCell>
                    <TableCell>{ticket.line}</TableCell>
                    <TableCell>{ticket.wait}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === "spoken" ? "secondary" : "outline"}>
                        {statusLabel[ticket.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Draft a brief</CardTitle>
            <CardDescription>OpenAI SDK first, Groq fallback, ElevenLabs to speak</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} rows={4} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onDraft()} disabled={pending}>
                {pending ? "Drafting" : "Draft brief"}
              </Button>
              <Button variant="outline" disabled={!brief}>
                Speak
              </Button>
            </div>
            {brief ? (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{brief.source}</Badge>
                  <Badge variant="secondary">{brief.voice}</Badge>
                </div>
                <p className="text-sm leading-6">{brief.text}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a ticket or write a topic, then draft.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={Boolean(openTicket)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent>
          {openTicket ? <TicketDetail ticket={openTicket} onDraft={() => onDraft(openTicket.topic)} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TicketDetail({ ticket, onDraft }: { ticket: Ticket; onDraft: () => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{ticket.caller}</SheetTitle>
        <SheetDescription>
          {ticket.id} · {ticket.line}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-3 px-4">
        <p className="text-sm leading-6">{ticket.topic}</p>
        <Badge variant="outline">{statusLabel[ticket.status]}</Badge>
      </div>
      <SheetFooter>
        <Button onClick={onDraft}>Draft this topic</Button>
      </SheetFooter>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
