export function coreWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CORE_WS_URL;
  if (explicit) return explicit;
  const http = process.env.NEXT_PUBLIC_CORE_URL || "";
  if (http.startsWith("https://")) return `${http.replace("https://", "wss://")}/wall/ws`;
  if (http.startsWith("http://")) return `${http.replace("http://", "ws://")}/wall/ws`;
  return "wss://referee-core.cfi-ops.workers.dev/wall/ws";
}
