/** Long-lived isolated Chromium. Applies mouse and keyboard, then rescreenshots. */
export const TAKEOVER_SESSION_JS = `import { chromium } from "playwright";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

const target = process.env.TARGET_URL
  || (existsSync("/tmp/referee-target.txt") ? readFileSync("/tmp/referee-target.txt", "utf8").trim() : "");
mkdirSync("/tmp/takeover/inbox", { recursive: true });
mkdirSync("/out/evidence", { recursive: true });

function log(line) {
  appendFileSync("/tmp/e2e.out", String(line) + "\\n");
}

function writeStatus(status) {
  writeFileSync("/tmp/takeover/status.json", JSON.stringify(status));
}

writeStatus({
  state: "starting",
  reason: "Starting the isolated browser",
  url: target,
  signed_in: false,
  oauth: 1,
  password: 0,
  takeover: true,
});

if (!target) {
  writeStatus({
    state: "failed",
    reason: "no deploy url",
    url: "",
    signed_in: false,
    oauth: 0,
    password: 0,
    takeover: false,
  });
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
let active = await context.newPage();
active.on("popup", (popup) => {
  active = popup;
  popup.bringToFront().catch(() => {});
  popup.once("close", () => {
    if (active === popup) active = context.pages()[0] || active;
  });
});

await active.goto(target, { waitUntil: "domcontentloaded", timeout: 25000 });
await active.screenshot({
  path: "/tmp/takeover/frame.png",
  clip: { x: 0, y: 0, width: 1280, height: 800 },
});
writeStatus({
  state: "waiting",
  reason: "Team can take over the isolated browser and finish Google or GitHub login",
  url: active.url(),
  signed_in: false,
  oauth: 1,
  password: 0,
  takeover: true,
});
log("browser ready " + active.url());

async function applyInbox() {
  const inbox = "/tmp/takeover/inbox";
  const files = existsSync(inbox) ? readdirSync(inbox).filter((name) => name.endsWith(".json")).sort() : [];
  let applied = 0;
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
      if (active.isClosed()) active = context.pages()[0] || active;
      await active.bringToFront().catch(() => {});
      if (cmd.type === "click") {
        const x = Number(cmd.x) || 0;
        const y = Number(cmd.y) || 0;
        await active.mouse.move(x, y);
        await active.mouse.click(x, y, { delay: 40 });
        await active.waitForTimeout(180);
      } else if (cmd.type === "type") {
        await active.keyboard.type(String(cmd.text || ""), { delay: 18 });
      } else if (cmd.type === "key") {
        await active.keyboard.press(String(cmd.key || "Enter"));
      }
      applied += 1;
      log("applied " + cmd.type);
    } catch (error) {
      writeFileSync("/out/evidence/e2e-takeover.log", String(error));
      log("input failed " + error);
    }
  }
  return applied;
}

async function shot() {
  if (active.isClosed()) return;
  await active.screenshot({
    path: "/tmp/takeover/frame.png",
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });
  writeStatus({
    state: existsSync("/tmp/takeover/done") ? "done" : "waiting",
    reason: "Team can take over the isolated browser and finish Google or GitHub login",
    url: active.url(),
    signed_in: false,
    oauth: 1,
    password: 0,
    takeover: true,
  });
}

const deadline = Date.now() + 12 * 60 * 1000;
let lastShot = Date.now();
while (Date.now() < deadline) {
  if (existsSync("/tmp/takeover/done")) break;
  const applied = await applyInbox();
  if (applied || Date.now() - lastShot > 450) {
    try { await shot(); lastShot = Date.now(); } catch {}
  }
  if (existsSync("/tmp/takeover/done")) break;
  await new Promise((resolve) => setTimeout(resolve, 80));
}

await browser.close();
`;
