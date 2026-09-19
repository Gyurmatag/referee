export type TicketStatus = "queued" | "drafting" | "spoken";

export type Ticket = {
  id: string;
  caller: string;
  line: string;
  topic: string;
  wait: string;
  status: TicketStatus;
};

export const tickets: Ticket[] = [
  {
    id: "VD-104",
    caller: "Nora K.",
    line: "4-6 tram",
    topic: "BKK night service on the 4-6 tram",
    wait: "1m",
    status: "queued",
  },
  {
    id: "VD-105",
    caller: "Mate H.",
    line: "M2 metro",
    topic: "Astoria transfer after last M2",
    wait: "4m",
    status: "queued",
  },
  {
    id: "VD-101",
    caller: "Eszter P.",
    line: "Night 931",
    topic: "Walk-up from Impact Hub to night bus 931",
    wait: "—",
    status: "spoken",
  },
  {
    id: "VD-098",
    caller: "Gabor S.",
    line: "4-6 tram",
    topic: "Wheelchair gap at Blaha Lujza after midnight",
    wait: "—",
    status: "drafting",
  },
];

export const seedBriefs = [
  {
    id: "BR-12",
    topic: "Walk-up from Impact Hub to night bus 931",
    text: "From Impact Hub, walk to Astoria and take night bus 931 toward Buda. Allow eight minutes on foot and stay on the well-lit Rákóczi side.",
    source: "fixture",
  },
  {
    id: "BR-11",
    topic: "Sunday tram replacement on the 4-6",
    text: "Replacement buses follow the 4-6 alignment between Széll Kálmán and Móricz. Post the walk-up map at the desk and keep the audio brief under 30 seconds.",
    source: "openai",
  },
];
