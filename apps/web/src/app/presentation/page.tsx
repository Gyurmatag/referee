import type { Metadata } from "next";
import { PresentationDeck } from "@/components/presentation-deck";

export const metadata: Metadata = {
  title: "Referee",
};

export default function PresentationPage() {
  return <PresentationDeck />;
}
