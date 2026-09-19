export const E2E_CAPTURE_JS = `import { chromium } from "playwright";
import { createServer } from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

const target = process.env.TARGET_URL
  || (existsSync("/tmp/referee-target.txt") ? readFileSync("/tmp/referee-target.txt", "utf8").trim() : "");
mkdirSync("/out/evidence", { recursive: true });
mkdirSync("/tmp/takeover/inbox", { recursive: true });

let demo = { user: "", password: "" };
try {
  if (existsSync("/tmp/referee-demo.json")) {
    demo = JSON.parse(readFileSync("/tmp/referee-demo.json", "utf8"));
  }
} catch {}

function writeStatus(status) {
  writeFileSync("/tmp/takeover/status.json", JSON.stringify(status));
}

function oauthLocator(page) {
  const name = /sign in with (google|github|apple)|continue with (google|github|apple)|log in with (google|github|apple)/i;
  return page
    .getByRole("button", { name })
    .or(page.getByRole("link", { name }))
    .or(page.getByText(name));
}

async function wallCounts(page) {
  const password = await page.locator('input[type="password"]').count();
  let oauth = 0;
  try {
    oauth = await oauthLocator(page).count();
  } catch {}
  if (!oauth) {
    const html = await page.content().catch(() => "");
    if (/continue with google|sign in with github|sign in with apple|log in with (google|github|apple)/i.test(html)) {
      oauth = 1;
    }
  }
  return { password, oauth, wall: password > 0 || oauth > 0 };
}

function reasonFor(counts) {
  if (counts.oauth > 0) return "Team can take over the isolated browser and finish Google or GitHub login";
  if (counts.password > 0) return "Team can take over the isolated browser and sign in";
  return "";
}

if (!target) {
  writeFileSync("/out/e2e.json", JSON.stringify({
    ok: false,
    reason: "no deploy url",
    pass: 0,
    fail: 0,
    target: "",
    signed_in: false,
    takeover: false,
  }));
  writeStatus({
    state: "failed",
    reason: "no deploy url",
    url: "",
    signed_in: false,
    oauth: 0,
    password: 0,
    takeover: false,
  });
  process.exit(0);
}

createServer((req, res) => {
  if ((req.url || "").startsWith("/health") || (req.url || "").startsWith("/status")) {
    const body = existsSync("/tmp/takeover/status.json")
      ? readFileSync("/tmp/takeover/status.json")
      : JSON.stringify({ state: "starting" });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(8790, "127.0.0.1");

writeStatus({
  state: "starting",
  reason: "",
  url: target,
  signed_in: false,
  oauth: 0,
  password: 0,
  takeover: false,
});

const pages = [
  { name: "home", url: target },
  { name: "health", url: target.replace(/\\/$/, "") + "/health" },
];

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
let active = page;
page.on("popup", (popup) => {
  active = popup;
  popup.once("close", () => {
    if (active === popup) active = page;
  });
});

let pass = 0;
let fail = 0;
let signed_in = false;
let takeover = false;
const shots = [];

for (const item of pages) {
  try {
    const res = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    const status = res ? res.status() : 0;
    const file = "/out/evidence/e2e-" + item.name + ".png";
    await page.screenshot({ path: file, fullPage: true });
    shots.push({ name: item.name, status, file });
    if (existsSync(file) && (item.name !== "home" || (status >= 200 && status < 400) || status === 0)) {
      pass += 1;
    } else if (item.name === "home") {
      fail += 1;
    }
    if (item.name === "home") {
      const early = await wallCounts(page).catch(() => ({ password: 0, oauth: 0, wall: false }));
      if (early.wall) {
        takeover = true;
        writeStatus({
          state: "waiting",
          reason: reasonFor(early),
          url: page.url(),
          signed_in: false,
          oauth: early.oauth,
          password: early.password,
          takeover: true,
        });
      }
    }
  } catch (error) {
    fail += 1;
    writeFileSync("/out/evidence/e2e-" + item.name + ".log", String(error));
  }
}

try {
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25000 });
} catch {}

try {
  await active
    .getByText(/continue with google|sign in with github|members only|password/i)
    .first()
    .waitFor({ timeout: 8000 });
} catch {}

if (demo.user && demo.password) {
  try {
    const user = page.locator('input[type="email"], input[name="email"], input[name="username"], input[autocomplete="username"]').first();
    const secret = page.locator('input[type="password"]').first();
    if (await user.count() && await secret.count()) {
      await user.fill(demo.user);
      await secret.fill(demo.password);
      const submit = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submit.count()) await submit.click();
      else await page.keyboard.press("Enter");
      await page.waitForTimeout(2500);
    }
  } catch (error) {
    writeFileSync("/out/evidence/e2e-app.log", String(error));
  }
}

// never click oauth - the isolated browser waits for the team instead
let counts = await wallCounts(active).catch(() => ({ password: 0, oauth: 0, wall: false }));
if (counts.wall) {
  takeover = true;
  writeStatus({
    state: "waiting",
    reason: reasonFor(counts),
    url: active.url(),
    signed_in: false,
    oauth: counts.oauth,
    password: counts.password,
    takeover: true,
  });
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline) {
    if (existsSync("/tmp/takeover/done")) break;
    const inbox = "/tmp/takeover/inbox";
    const files = existsSync(inbox) ? readdirSync(inbox).filter((name) => name.endsWith(".json")).sort() : [];
    for (const name of files) {
      const path = inbox + "/" + name;
      let cmd = null;
      try { cmd = JSON.parse(readFileSync(path, "utf8")); } catch {}
      try { unlinkSync(path); } catch {}
      if (!cmd || !cmd.type) continue;
      if (cmd.type === "done") {
        writeFileSync("/tmp/takeover/done", "1");
        break;
      }
      try {
        if (active.isClosed()) active = page;
        if (cmd.type === "click") await active.mouse.click(Number(cmd.x) || 0, Number(cmd.y) || 0);
        else if (cmd.type === "type") await active.keyboard.type(String(cmd.text || ""), { delay: 12 });
        else if (cmd.type === "key") await active.keyboard.press(String(cmd.key || "Enter"));
      } catch (error) {
        writeFileSync("/out/evidence/e2e-takeover.log", String(error));
      }
    }
    try {
      if (!active.isClosed()) {
        await active.screenshot({
          path: "/tmp/takeover/frame.png",
          clip: { x: 0, y: 0, width: 1280, height: 800 },
        });
        counts = await wallCounts(active);
        writeStatus({
          state: existsSync("/tmp/takeover/done") ? "done" : "waiting",
          reason: reasonFor(counts),
          url: active.url(),
          signed_in: !counts.wall,
          oauth: counts.oauth,
          password: counts.password,
          takeover: true,
        });
      }
    } catch {}
    if (existsSync("/tmp/takeover/done")) break;
    await new Promise((resolve) => setTimeout(resolve, 280));
  }
}

try {
  if (active.isClosed()) active = page;
  await active.screenshot({ path: "/out/evidence/e2e-app.png", fullPage: true });
  counts = await wallCounts(active);
  signed_in = !counts.wall;
  if (signed_in) pass += 1;
  else if (takeover || (demo.user && demo.password)) fail += 1;
  shots.push({ name: "app", signed_in, takeover });
} catch (error) {
  writeFileSync("/out/evidence/e2e-app.log", String(error));
}

try {
  await context.storageState({ path: "/tmp/referee-storage.json" });
} catch {}

writeFileSync("/out/e2e.json", JSON.stringify({
  ok: true,
  target,
  pass,
  fail,
  signed_in,
  takeover,
  shots,
}));
writeStatus({
  state: "done",
  reason: signed_in ? "signed in" : "review finished",
  url: active.isClosed() ? target : active.url(),
  signed_in,
  oauth: counts.oauth || 0,
  password: counts.password || 0,
  takeover,
});
await browser.close();
`;
