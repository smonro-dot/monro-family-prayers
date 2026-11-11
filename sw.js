/* Shell cache name changes only when app files change.
   Recordings update without a code change: a reload online refetches the mp3. */
const CACHE = "monro-prayers-v3";
const SHELL = [
  "index.html",
  "sources.html",
  "manifest.json",
  "sw.js",
  "css/app.css",
  "js/app.js",
  "js/prayers.js",
  "audio/catalog.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png"
];

const refreshing = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = SHELL.map((path) => new URL(path, self.registration.scope).href);
    await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isAudio(url) {
  return /\/audio\/[^/]+\.mp3$/i.test(url.pathname);
}

function audioHeaders(type, length) {
  const headers = {
    "Content-Type": type || "audio/mpeg",
    "Accept-Ranges": "bytes"
  };
  if (length != null) headers["Content-Length"] = String(length);
  return headers;
}

function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const startRaw = match[1];
  const endRaw = match[2];
  if (startRaw === "" && endRaw === "") return null;
  let start;
  let end;
  if (startRaw === "") {
    const suffix = Number(endRaw);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === "" ? size - 1 : Number(endRaw);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return { unsatisfiable: true, size: size };
  }
  return { start: start, end: Math.min(end, size - 1), size: size };
}

function rangeResponse(buffer, header, contentType) {
  const total = buffer.byteLength;
  const parsed = parseRange(header, total);
  if (!parsed) {
    return new Response(buffer.slice(0), {
      status: 200,
      headers: audioHeaders(contentType, total)
    });
  }
  if (parsed.unsatisfiable) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": "bytes */" + total, "Accept-Ranges": "bytes" }
    });
  }
  const sliced = buffer.slice(parsed.start, parsed.end + 1);
  return new Response(sliced, {
    status: 206,
    headers: {
      "Content-Type": contentType || "audio/mpeg",
      "Content-Length": String(sliced.byteLength),
      "Content-Range": "bytes " + parsed.start + "-" + parsed.end + "/" + total,
      "Accept-Ranges": "bytes"
    }
  });
}

function refreshFull(url) {
  if (refreshing.has(url)) return refreshing.get(url);
  const work = (async () => {
    const resp = await fetch(new Request(url, {
      method: "GET",
      headers: { Accept: "audio/mpeg" }
    }));
    if (!resp.ok || resp.status !== 200) {
      await resp.arrayBuffer().catch(() => {});
      return { ok: false, status: resp.status };
    }
    const buf = await resp.arrayBuffer();
    const type = resp.headers.get("Content-Type") || "audio/mpeg";
    const cache = await caches.open(CACHE);
    await cache.put(url, new Response(buf.slice(0), {
      status: 200,
      headers: audioHeaders(type, buf.byteLength)
    }));
    return { ok: true, buf: buf, type: type };
  })();
  refreshing.set(url, work);
  work.finally(() => refreshing.delete(url));
  return work;
}

async function handleAudio(req) {
  const url = new URL(req.url);
  const key = url.origin + url.pathname;
  const range = req.headers.get("range");
  const cache = await caches.open(CACHE);
  const cached = req.cache === "reload" ? undefined : await cache.match(key);

  if (cached && range) {
    const buf = await cached.arrayBuffer();
    return rangeResponse(buf, range, cached.headers.get("Content-Type") || "audio/mpeg");
  }
  if (cached && !range) return cached;

  try {
    if (range) {
      const network = await fetch(req);
      if (network.status === 200 || network.status === 206) {
        refreshFull(key).catch(() => {});
      } else {
        await network.clone().arrayBuffer().catch(() => {});
      }
      return network;
    }
    const full = await refreshFull(key);
    if (!full.ok) return new Response("Recording not found.", { status: full.status || 404 });
    return new Response(full.buf.slice(0), {
      status: 200,
      headers: audioHeaders(full.type, full.buf.byteLength)
    });
  } catch (err) {
    const fallback = await cache.match(key);
    if (!fallback) {
      return new Response("Recording unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
    const buf = await fallback.arrayBuffer();
    return rangeResponse(buf, range, fallback.headers.get("Content-Type") || "audio/mpeg");
  }
}

async function handleShell(req) {
  const cache = await caches.open(CACHE);
  if (req.cache !== "reload") {
    const cached = await cache.match(req);
    if (cached) {
      updateShell(req, cache);
      return cached;
    }
  }
  try {
    const resp = await fetch(req);
    if (resp.ok && resp.status === 200) {
      await cache.put(req, resp.clone());
      if (req.mode === "navigate") {
        await cache.put(new URL("index.html", self.registration.scope), resp.clone());
      }
    }
    return resp;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === "navigate") {
      const index = await cache.match(new URL("index.html", self.registration.scope));
      if (index) return index;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

async function updateShell(req, cache) {
  try {
    const resp = await fetch(req);
    if (resp.ok && resp.status === 200) await cache.put(req, resp.clone());
  } catch (err) {
    /* Keep the cached copy when the phone is offline. */
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (isAudio(url)) {
    event.respondWith(handleAudio(req));
    return;
  }
  event.respondWith(handleShell(req));
});
