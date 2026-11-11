import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve-subpath.mjs";

const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || "/tmp/pwa-tools/package.json");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREVIEW = path.join(ROOT, "docs", "preview");
const LOG = [];
const failures = [];

function log(line) {
  LOG.push(line);
  console.log(line);
}

function assert(cond, message) {
  if (!cond) {
    failures.push(message);
    log("FAIL " + message);
  } else {
    log("ok   " + message);
  }
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const TONE = path.join(ROOT, "audio", "compline-sunday.mp3");

function makeTone() {
  const result = spawnSync("ffmpeg", [
    "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=4",
    "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame", "-b:a", "64k", TONE
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "ffmpeg failed");
}

async function main() {
  const { chromium } = require("playwright-core");
  fs.mkdirSync(PREVIEW, { recursive: true });
  const { server, url } = await startServer({ host: "127.0.0.1", port: 0 });
  log("server " + url);
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
  });
  await context.addInitScript(() => {
    window.__installPrompt = false;
    window.addEventListener("beforeinstallprompt", (event) => {
      window.__installPrompt = true;
      event.preventDefault();
    });
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/404 \(Not Found\)|Failed to load resource/.test(text)) return;
    consoleErrors.push(text);
  });

  try {
    const rootStatus = await fetch(url.replace("/monro-family-prayers/", "/"));
    assert(rootStatus.status === 404, "site is not mounted at the domain root");

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller);
    await page.waitForFunction(() => document.querySelector("#offline-status").textContent.includes("Saved for offline"));

    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const resp = await fetch(link.href);
      return { href: link.href, json: await resp.json(), sw: {
        scope: (await navigator.serviceWorker.getRegistration()).scope,
        script: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL,
        state: navigator.serviceWorker.controller && navigator.serviceWorker.controller.state
      } };
    });
    assert(manifest.href.endsWith("/monro-family-prayers/manifest.json"), "manifest link is under the subpath");
    assert(manifest.json.id === "/monro-family-prayers/", "manifest id");
    assert(manifest.json.start_url === "/monro-family-prayers/", "manifest start_url");
    assert(manifest.json.scope === "/monro-family-prayers/", "manifest scope");
    assert(manifest.json.display === "standalone", "manifest display standalone");
    assert(manifest.sw.scope.endsWith("/monro-family-prayers/"), "service worker scope " + manifest.sw.scope);
    assert(manifest.sw.script.endsWith("/monro-family-prayers/sw.js"), "service worker script " + manifest.sw.script);
    assert(manifest.sw.state === "activated", "service worker activated");
    for (const icon of manifest.json.icons) {
      const iconUrl = new URL(icon.src, url).href;
      const resp = await fetch(iconUrl);
      assert(resp.status === 200, "icon " + icon.src);
      const buf = Buffer.from(await resp.arrayBuffer());
      const size = pngSize(buf);
      const expected = Number(icon.sizes.split("x")[0]);
      assert(size.width === expected && size.height === expected, icon.src + " is " + size.width + "x" + size.height);
    }

    async function shot(name) {
      const file = path.join(PREVIEW, name);
      await page.screenshot({ path: file, fullPage: false, type: "png" });
      const size = pngSize(fs.readFileSync(file));
      assert(size.width === 390 && size.height === 844, name + " is 390x844");
    }

    await page.waitForFunction(() => document.querySelector("h1") && document.body.textContent.includes("Night Prayer"));
    await shot("01-home.png");
    await shot("night-screen.png");
    assert((await page.locator("h1").textContent()).includes("Night Prayer"), "night title");
    assert((await page.locator("body").textContent()).includes("For Spencer & Rosie"), "dedication");
    assert((await page.locator("body").textContent()).includes("Five minutes, face to face"), "timer link");
    assert((await page.locator("body").textContent()).includes("Beginning"), "beginning section");
    assert((await page.locator("body").textContent()).includes("Simeon's Song"), "simeon section");

    const seen = new Set();
    async function collectIds() {
      const ids = await page.$$eval("[data-audio-id]", (nodes) => nodes.map((node) => node.getAttribute("data-audio-id")));
      ids.forEach((id) => seen.add(id));
    }

    const nights = [
      ["sunday", "terror of the night", "02-compline-sunday.png"],
      ["monday", "plenteous in mercy", "03-compline-monday.png"],
      ["tuesday", "enter not into judgment", "04-compline-tuesday.png"],
      ["wednesday", "Out of the depths", "05-compline-wednesday.png"],
      ["thursday", "my flesh also shall rest in hope", "06-compline-thursday.png"],
      ["friday", "in the day, and in the night", "07-compline-friday.png"],
      ["saturday", "In the nights lift up your hands", "08-compline-saturday.png"]
    ];
    for (const [day, phrase, file] of nights) {
      await page.goto(url + "#/night/" + day, { waitUntil: "networkidle" });
      await page.waitForFunction((value) => document.body.innerText.includes(value), phrase);
      await page.waitForFunction((value) => document.body.innerText.includes("audio/compline-" + value + ".mp3"), day);
      assert(await page.locator("#dock").getAttribute("hidden") !== null, day + " hides the player when the file is missing");
      assert(await page.locator("audio[src]").count() === 0, day + " has no audio src");
      await shot(file);
      await collectIds();
    }
    assert(await page.locator("body").innerText().then((text) => text.includes("In peace in the selfsame")), "Saturday includes Psalm 4");

    await page.goto(url + "#/morning", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.body.innerText.includes("Immaculate Heart of Mary"));
    await page.waitForFunction(() => document.body.innerText.includes("audio/morning-offering.mp3"));
    await collectIds();
    await shot("09-morning-offering.png");

    await page.goto(url + "#/rosary", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.body.textContent.includes("Closing prayer"));
    const rosaryText = await page.evaluate(() => document.body.textContent);
    for (const phrase of ["Joyful Mysteries", "Sorrowful Mysteries", "Glorious Mysteries", "Luminous Mysteries", "Hail, holy Queen"]) {
      assert(rosaryText.includes(phrase), "rosary has " + phrase);
    }
    await collectIds();
    await shot("10-rosary.png");

    await page.goto(url + "#/common", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.body.textContent.includes("Pour forth, we beseech thee"));
    const commonText = await page.evaluate(() => document.body.textContent);
    for (const phrase of ["I believe in God", "heartily sorry", "Angel of God", "Saint Michael the Archangel", "The Angel of the Lord declared unto Mary"]) {
      assert(commonText.includes(phrase), "common prayers include " + phrase);
    }
    await collectIds();
    await shot("11-common-prayers.png");
    await page.goto(url + "#/timer", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#timer-clock") && document.querySelector("#timer-clock").textContent === "5:00");
    await shot("timer-screen.png");
    await page.click("#timer-start");
    await page.waitForFunction(() => document.querySelector("#timer-clock").textContent !== "5:00");
    log("ok   face-to-face timer advances");

    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "audio", "catalog.json"), "utf8"));
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    for (const prayer of catalog.prayers) {
      assert(seen.has(prayer.id), "screen exposes " + prayer.id);
      assert(readme.includes(prayer.id) && readme.includes(prayer.file), "README contract lists " + prayer.file);
      assert(!prayer.file.includes("/") && prayer.file.endsWith(".mp3"), prayer.file + " is a basename mp3");
    }
    assert(new Set(catalog.prayers.map((item) => item.file)).size === catalog.prayers.length, "filenames are unique");

    await page.goto(url + "sources.html", { waitUntil: "networkidle" });
    assert((await page.locator("body").innerText()).includes("Douay-Rheims"), "sources page");

    await context.setOffline(true);
    const offlineResponse = await page.goto(url, { waitUntil: "domcontentloaded" });
    assert(offlineResponse && offlineResponse.ok(), "offline reload of the app shell");
    await page.waitForFunction(() => document.querySelector("h1") && document.querySelector("h1").textContent.includes("Night Prayer"));
    await page.goto(url + "#/night/friday", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("in the day, and in the night"));
    await page.goto(url + "#/morning", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("Immaculate Heart of Mary"));
    log("ok   offline text for home, Friday Compline, and Morning Offering");
    await context.setOffline(false);

    makeTone();
    log("temporary tone " + fs.statSync(TONE).size + " bytes (not committed)");
    await page.goto(url + "#/night/sunday", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("#night-play"));
    await page.waitForFunction(() => {
      const audio = document.querySelector("#prayer-audio");
      return audio && audio.readyState >= 2;
    });
    await page.click("#night-play");
    await page.waitForFunction(() => {
      const audio = document.querySelector("#prayer-audio");
      return audio && !audio.paused && audio.currentTime > 0.2 && document.querySelector("#play-state").textContent === "Playing";
    });
    const session = await page.evaluate(() => ({
      title: document.body.dataset.mediaTitle,
      session: document.body.dataset.audioSession,
      metadata: navigator.mediaSession.metadata && navigator.mediaSession.metadata.title,
      artist: navigator.mediaSession.metadata && navigator.mediaSession.metadata.artist,
      state: navigator.mediaSession.playbackState
    }));
    assert(session.title === "Sunday Night Prayer", "media title set");
    assert(session.metadata === "Sunday Night Prayer", "Media Session metadata title");
    assert(session.artist === "Monro Family Prayers", "Media Session artist");
    assert(session.state === "playing", "Media Session playback state");
    log("audioSession " + session.session);
    const hidden = await page.evaluate(() => {
      const audio = document.querySelector("#prayer-audio");
      document.dispatchEvent(new Event("visibilitychange"));
      return audio.paused;
    });
    assert(hidden === false, "hiding the page does not pause playback");
    await page.waitForFunction(() => document.querySelector("#prayer-audio").currentTime > 1);
    await shot("12-audio-playing.png");

    const audioUrl = new URL("audio/compline-sunday.mp3", url).href;
    await page.waitForFunction(async (src) => {
      const cache = await caches.open("monro-prayers-v3");
      const hit = await cache.match(src);
      return Boolean(hit && hit.status === 200);
    }, audioUrl);

    const onlineRange = await page.evaluate(async (src) => {
      const resp = await fetch(src, { headers: { Range: "bytes=0-1" } });
      const buf = await resp.arrayBuffer();
      return { status: resp.status, range: resp.headers.get("content-range"), length: buf.byteLength };
    }, audioUrl);
    assert(onlineRange.status === 206 && onlineRange.length === 2, "online range is 206 (" + JSON.stringify(onlineRange) + ")");

    await context.setOffline(true);
    const offlineRange = await page.evaluate(async (src) => {
      const resp = await fetch(src, { headers: { Range: "bytes=0-1" } });
      const buf = await resp.arrayBuffer();
      return { status: resp.status, range: resp.headers.get("content-range"), length: buf.byteLength, type: resp.headers.get("content-type") };
    }, audioUrl);
    assert(offlineRange.status === 206 && offlineRange.length === 2, "offline range is 206 (" + JSON.stringify(offlineRange) + ")");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("terror of the night"));
    await page.waitForFunction(() => document.querySelector("#night-play"));
    await page.waitForFunction(() => document.querySelector("#prayer-audio") && document.querySelector("#prayer-audio").readyState >= 2);
    await page.click("#night-play");
    await page.waitForFunction(() => {
      const audio = document.querySelector("#prayer-audio");
      return audio && !audio.paused && audio.currentTime > 0.2;
    });
    log("ok   offline playback advanced currentTime");
    await context.setOffline(false);

    const prompt = await page.evaluate(() => window.__installPrompt);
    log("beforeinstallprompt fired: " + prompt);

    const names = ["Owen", "Phoebe", "roofmaxx"];
    const tree = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "docs") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(html|js|json|css|md|yml)$/.test(entry.name)) tree.push(full);
      }
    }
    walk(ROOT);
    const blob = tree.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const dedication = "For Spencer &amp; Rosie";
    assert(blob.includes(dedication), "footer dedication is present");
    const stripped = blob.split(dedication).join("");
    assert(!stripped.includes("Spencer") && !stripped.includes("Rosie"), "no other given names were added");
    for (const name of names) {
      assert(!blob.includes(name), "working tree app files do not contain " + name);
    }
    assert(consoleErrors.length === 0, "no page errors (" + consoleErrors.join(" | ") + ")");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    if (fs.existsSync(TONE)) fs.unlinkSync(TONE);
  }

  fs.writeFileSync(path.join(PREVIEW, "verify-log.txt"), LOG.join("\n") + "\n");
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  log("ALL CHECKS PASSED");
  fs.writeFileSync(path.join(PREVIEW, "verify-log.txt"), LOG.join("\n") + "\n");
}

main().catch((err) => {
  console.error(err);
  if (fs.existsSync(TONE)) fs.unlinkSync(TONE);
  process.exit(1);
});
