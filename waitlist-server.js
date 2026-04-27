const http = require("http");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const NDJSON_FILE = path.join(DATA_DIR, "waitlist-submissions.ndjson");
const CSV_FILE = path.join(DATA_DIR, "waitlist-submissions.csv");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sanitizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function csvEscape(value) {
  const s = String(value == null ? "" : value);
  return `"${s.replace(/"/g, '""')}"`;
}

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(CSV_FILE, fs.constants.F_OK);
  } catch {
    const header = [
      "id",
      "submitted_at",
      "name",
      "phone",
      "email",
      "zips",
      "license",
      "consent",
      "source",
      "ip",
      "user_agent",
    ].join(",");
    await fsp.writeFile(CSV_FILE, header + "\n", "utf8");
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function validateSubmission(body) {
  const phoneDigits = sanitizeText(body.phone).replace(/\D/g, "");
  const cleaned = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    submitted_at: new Date().toISOString(),
    name: sanitizeText(body.name),
    phone: sanitizeText(body.phone),
    email: sanitizeText(body.email),
    zips: sanitizeText(body.zips),
    license: sanitizeText(body.license),
    consent: Boolean(body.consent),
    source: sanitizeText(body.source || "provider_waitlist_landing"),
  };

  if (!cleaned.name) return { ok: false, error: "Name is required." };
  if (phoneDigits.length < 10) return { ok: false, error: "Valid phone is required." };
  if (!cleaned.zips) return { ok: false, error: "At least one zip/service area is required." };
  if (!cleaned.consent) return { ok: false, error: "SMS consent is required." };
  return { ok: true, data: cleaned };
}

async function saveSubmission(submission, req) {
  await ensureStorage();
  const record = {
    ...submission,
    ip: req.socket.remoteAddress || "",
    user_agent: sanitizeText(req.headers["user-agent"] || ""),
  };
  await fsp.appendFile(NDJSON_FILE, JSON.stringify(record) + "\n", "utf8");
  const csvRow = [
    record.id,
    record.submitted_at,
    record.name,
    record.phone,
    record.email,
    record.zips,
    record.license,
    record.consent ? "yes" : "no",
    record.source,
    record.ip,
    record.user_agent,
  ]
    .map(csvEscape)
    .join(",");
  await fsp.appendFile(CSV_FILE, csvRow + "\n", "utf8");
}

function safePath(urlPath) {
  const normalized = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT, normalized);
}

function serveFile(req, res, urlPath) {
  let reqPath = urlPath === "/" ? "/index.html" : urlPath;
  reqPath = reqPath.split("?")[0];
  const filePath = safePath(reqPath);
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  if (method === "POST" && pathname === "/api/waitlist") {
    try {
      const body = await parseBody(req);
      const checked = validateSubmission(body);
      if (!checked.ok) {
        sendJson(res, 400, { ok: false, error: checked.error });
        return;
      }
      await saveSubmission(checked.data, req);
      sendJson(res, 201, { ok: true, id: checked.data.id });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message || "Server error" });
    }
    return;
  }

  if (method === "GET" && pathname === "/api/waitlist/submissions") {
    try {
      await ensureStorage();
      const csv = await fsp.readFile(CSV_FILE, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"waitlist-submissions.csv\"",
      });
      res.end(csv);
    } catch {
      sendJson(res, 500, { ok: false, error: "Could not read submissions" });
    }
    return;
  }

  if (method === "GET") {
    serveFile(req, res, pathname);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Waitlist server running at http://localhost:${PORT}`);
  console.log("Main page: GET /");
  console.log("POST /api/waitlist to capture local submissions");
  console.log("GET  /api/waitlist/submissions to download CSV");
});
