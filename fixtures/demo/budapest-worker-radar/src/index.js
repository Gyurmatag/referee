export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, team: "Team Chain Bridge", platform: "cloudflare-workers" });
    }
    if (url.pathname === "/api/scan" && request.method === "POST") {
      if (env.OPENAI_API_KEY) {
        const res = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            input: "Name three late-night BKK connections a visitor can walk to from Impact Hub Budapest.",
          }),
        });
        const json = await res.json();
        return Response.json({ source: "openai", text: json.output_text ?? json });
      }
      return Response.json({
        source: "fixture",
        text: "4-6 tram, M2 at Astoria, night bus 931. Built with the OpenAI SDK on Cloudflare Workers.",
      });
    }
    return new Response(
      `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Team Chain Bridge - Radar</title></head>
  <body style="font-family:sans-serif;margin:2rem;max-width:40rem">
    <h1>Chain Bridge Radar</h1>
    <p>Deployed on Cloudflare Workers. Uses the OpenAI SDK.</p>
    <button id="go">Scan</button>
    <pre id="out"></pre>
    <script>
      document.getElementById("go").onclick = async () => {
        const res = await fetch("/api/scan", { method: "POST" });
        document.getElementById("out").textContent = JSON.stringify(await res.json(), null, 2);
      };
    </script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  },
};
