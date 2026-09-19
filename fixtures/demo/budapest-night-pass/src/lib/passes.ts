export type Wristband = {
  id: string;
  guest: string;
  gate: string;
  status: "ready" | "inside" | "held";
};

export const wristbands: Wristband[] = [
  { id: "NP-104", guest: "Ada Pest", gate: "Margit híd", status: "ready" },
  { id: "NP-118", guest: "Bálint Óbuda", gate: "Hajóállomás", status: "inside" },
  { id: "NP-121", guest: "Noémi Újlipótváros", gate: "Zenekert", status: "ready" },
  { id: "NP-130", guest: "Tamás Margaret", gate: "Margit híd", status: "held" },
];
