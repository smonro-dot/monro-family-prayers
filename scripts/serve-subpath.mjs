import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "/monro-family-prayers";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

function fileFor(urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/") rel = "/index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  return file;
}

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body == null) res.end();
  else res.end(body);
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, { Allow: "GET, HEAD", "Cache-Control": "no-store" }, "Method not allowed");
      return;
    }
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + "/")) {
      send(res, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    const rel = url.pathname.slice(PREFIX.length) || "/";
    const file = fileFor(rel);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      send(res, 404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    const stat = fs.statSync(file);
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const base = {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache"
    };
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        send(res, 416, { ...base, "Content-Range": `bytes */${stat.size}` }, null);
        return;
      }
      let start;
      let end;
      if (match[1] === "") {
        const suffix = Number(match[2]);
        start = Math.max(stat.size - suffix, 0);
        end = stat.size - 1;
      } else {
        start = Number(match[1]);
        end = match[2] === "" ? stat.size - 1 : Number(match[2]);
      }
      if (!Number.isFinite(start) || start < 0 || start >= stat.size || end < start) {
        send(res, 416, { ...base, "Content-Range": `bytes */${stat.size}` }, null);
        return;
      }
      end = Math.min(end, stat.size - 1);
      const length = end - start + 1;
      res.writeHead(206, {
        ...base,
        "Content-Length": length,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { ...base, "Content-Length": stat.size });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

export function startServer({ host = "127.0.0.1", port = 0 } = {}) {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}${PREFIX}/`
      });
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  startServer({ host: "127.0.0.1", port }).then(({ url }) => {
    console.log(url);
  });
}
