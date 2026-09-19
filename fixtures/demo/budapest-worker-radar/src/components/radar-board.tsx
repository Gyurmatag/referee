"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runScan, type ScanResult } from "@/lib/openai-client";
import { routes, type RouteStatus, type TransitRoute } from "@/lib/routes";

const statusLabel: Record<RouteStatus, string> = {
  "on-time": "On time",
  delayed: "Delayed",
  night: "Night",
};

export function RadarBoard() {
  const [kind, setKind] = useState<"all" | TransitRoute["kind"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);

  const rows = useMemo(() => routes.filter((route) => kind === "all" || route.kind === kind), [kind]);
  const selected = routes.find((route) => route.id === openId) ?? null;

  async function onScan() {
    setPending(true);
    try {
      setScan(await runScan());
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Live routes" value="4" hint="Walk-up from Impact Hub" />
        <Stat label="Delayed" value="1" hint="9 bus at Blaha" />
        <Stat label="Last scan" value="21:14" hint="OpenAI SDK" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Network</CardTitle>
              <CardDescription>Late-night BKK connections</CardDescription>
            </div>
            <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="tram">Tram</SelectItem>
                <SelectItem value="metro">Metro</SelectItem>
                <SelectItem value="night-bus">Night bus</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Walk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((route) => (
                  <TableRow key={route.id} className="cursor-pointer" onClick={() => setOpenId(route.id)}>
                    <TableCell>
                      <div className="font-medium">{route.name}</div>
                      <div className="text-xs text-muted-foreground">{route.id}</div>
                    </TableCell>
                    <TableCell>{route.eta}</TableCell>
                    <TableCell>{route.walk}</TableCell>
                    <TableCell>
                      <Badge variant={route.status === "delayed" ? "destructive" : "outline"}>
                        {statusLabel[route.status]}
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
            <CardTitle>Run a scan</CardTitle>
            <CardDescription>Ask the OpenAI SDK for walk-up night connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onScan} disabled={pending}>
              {pending ? "Scanning" : "Scan"}
            </Button>
            {scan ? (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                <Badge variant="outline">{scan.source}</Badge>
                <p className="text-sm leading-6">{scan.text}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Scan writes a short night-service note for the wall.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent>
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.id} · {selected.kind}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-2 px-4 text-sm">
                <p>ETA {selected.eta}</p>
                <p>Walk from Impact Hub {selected.walk}</p>
                <Badge variant="outline">{statusLabel[selected.status]}</Badge>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
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
