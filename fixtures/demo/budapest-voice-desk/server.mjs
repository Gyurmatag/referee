import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { draftBrief } from "./src/sponsors.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, team: "Team Danube" }));
    return;
  }
  if (url.pathname === "/api/brief" && req.method === "POST") {
    const brief = await draftBrief("BKK night service on the 4-6 tram");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(brief));
    return;
  }
  const html = await readFile(join(root, "index.html"), "utf8");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`budapest-voice-desk listening on ${port}`);
});
