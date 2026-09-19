export function eventPlace(city?: string, venue?: string) {
  return [city, venue].filter((part) => part && part.trim()).join(" · ");
}

export function eventWhen(start?: string, end?: string) {
  if (!start) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const from = new Date(start).toLocaleDateString("en-GB", opts);
  if (!end) return from;
  return `${from} – ${new Date(end).toLocaleDateString("en-GB", opts)}`;
}


export function isPlaceholderEvent(event: { title?: string; city?: string; venue?: string } | null | undefined) {
  if (!event) return true;
  return event.title === "Event" && !event.city && !event.venue;
}
