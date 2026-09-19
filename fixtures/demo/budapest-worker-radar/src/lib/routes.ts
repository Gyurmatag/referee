export type RouteStatus = "on-time" | "delayed" | "night";

export type TransitRoute = {
  id: string;
  name: string;
  kind: "tram" | "metro" | "night-bus";
  status: RouteStatus;
  eta: string;
  walk: string;
};

export const routes: TransitRoute[] = [
  { id: "R-46", name: "4-6 tram", kind: "tram", status: "night", eta: "4 min", walk: "6 min" },
  { id: "R-M2", name: "M2 Astoria", kind: "metro", status: "on-time", eta: "last 23:50", walk: "8 min" },
  { id: "R-931", name: "Night bus 931", kind: "night-bus", status: "on-time", eta: "12 min", walk: "9 min" },
  { id: "R-9", name: "9 bus", kind: "night-bus", status: "delayed", eta: "18 min", walk: "11 min" },
];

export const scanLog = [
  { id: "SC-204", at: "21:14", summary: "Night spine is the 4-6. M2 still running to Astoria." },
  { id: "SC-203", at: "20:41", summary: "931 is the closest walk-up after the last metro." },
  { id: "SC-198", at: "19:08", summary: "9 bus delayed at Blaha. Keep visitors on the tram." },
];
