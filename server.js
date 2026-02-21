const fs = require("fs");
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kebun_dashboard_secret_change_me";
const COOKIE_NAME = "kebun_token";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "kebun.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spray_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  crop TEXT NOT NULL,
  location TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS planting_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  crop TEXT NOT NULL,
  location TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS harvest_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  harvest_type TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
`);

const defaultAdminEmail = "admin@kebun.local";
const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(defaultAdminEmail);
if (!existingAdmin) {
  const passwordHash = bcrypt.hashSync("admin123", 10);
  db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  ).run("Admin Kebun", defaultAdminEmail, passwordHash, "ADMIN");
}

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

function toISODate(value) {
  if (!value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return text;
}

function parseNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: "Belum login." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Sesi tidak valid. Silakan login lagi." });
  }
}

function cropValid(crop) {
  return crop === "HORENSO" || crop === "TERONG";
}

function harvestTypeValid(type) {
  return type === "HORENSO" || type === "TERONG" || type === "KONTENER_HORENSO";
}

function withUserName(table, alias, extraColumns) {
  return `SELECT ${alias}.*, u.name AS created_by_name ${extraColumns ? `, ${extraColumns}` : ""}
          FROM ${table} ${alias}
          JOIN users u ON u.id = ${alias}.created_by`;
}

function applyDateFilter(clauses, params, field, startDate, endDate) {
  if (startDate) {
    clauses.push(`${field} >= ?`);
    params.push(startDate);
  }
  if (endDate) {
    clauses.push(`${field} <= ?`);
    params.push(endDate);
  }
}

function buildSummary() {
  const today = toISODate();
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStart = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(
    weekStartDate.getDate()
  ).padStart(2, "0")}`;

  const sprayToday = db.prepare("SELECT COUNT(*) AS total FROM spray_logs WHERE date = ?").get(today).total;
  const plantingToday = db.prepare("SELECT COUNT(*) AS total FROM planting_logs WHERE date = ?").get(today).total;
  const harvestToday =
    db.prepare("SELECT COALESCE(SUM(qty), 0) AS total FROM harvest_logs WHERE date = ?").get(today).total || 0;
  const harvestWeek =
    db
      .prepare("SELECT COALESCE(SUM(qty), 0) AS total FROM harvest_logs WHERE date >= ? AND date <= ?")
      .get(weekStart, today).total || 0;

  return {
    today,
    summary: {
      sprayToday,
      plantingToday,
      harvestToday,
      harvestWeek,
    },
  };
}

function getHarvestRangeDefault() {
  const end = toISODate();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 13);
  const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(
    startDate.getDate()
  ).padStart(2, "0")}`;
  return { start, end };
}

function getHarvestDailyItems(startDate, endDate, harvestType) {
  const clauses = [];
  const params = [];
  applyDateFilter(clauses, params, "date", startDate, endDate);

  if (harvestType && harvestType !== "ALL") {
    clauses.push("harvest_type = ?");
    params.push(harvestType);
  }

  let query = "SELECT date, ROUND(SUM(qty), 2) AS total_qty FROM harvest_logs";
  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " GROUP BY date ORDER BY date ASC";
  return db.prepare(query).all(...params);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/public/summary", (_req, res) => {
  res.json(buildSummary());
});

app.get("/api/public/sprays", (_req, res) => {
  const items = db
    .prepare(
      "SELECT date, crop, location, note FROM spray_logs ORDER BY date DESC, id DESC LIMIT 20"
    )
    .all();
  res.json({ items });
});

app.get("/api/public/plantings", (_req, res) => {
  const items = db
    .prepare(
      "SELECT date, crop, location, note FROM planting_logs ORDER BY date DESC, id DESC LIMIT 20"
    )
    .all();
  res.json({ items });
});

app.get("/api/public/harvests", (_req, res) => {
  const items = db
    .prepare(
      "SELECT date, harvest_type, qty, unit, location, note FROM harvest_logs ORDER BY date DESC, id DESC LIMIT 20"
    )
    .all();
  res.json({ items });
});

app.get("/api/public/charts/harvest-daily", (req, res) => {
  const { startDate, endDate, harvestType } = req.query;
  const defaultRange = getHarvestRangeDefault();

  const start = startDate ? toISODate(startDate) : defaultRange.start;
  const end = endDate ? toISODate(endDate) : defaultRange.end;
  if (startDate && !start) {
    return res.status(400).json({ message: "Format startDate tidak valid." });
  }
  if (endDate && !end) {
    return res.status(400).json({ message: "Format endDate tidak valid." });
  }
  if (harvestType && harvestType !== "ALL" && !harvestTypeValid(harvestType)) {
    return res.status(400).json({ message: "Jenis panen tidak valid." });
  }

  const items = getHarvestDailyItems(start, end, harvestType);
  return res.json({ items });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Format email tidak valid." });
  }
  if (!password) {
    return res.status(400).json({ message: "Password wajib diisi." });
  }

  const user = db
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
    .get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Email atau password salah." });
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ ok: true });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

app.get("/api/dashboard/summary", authRequired, (_req, res) => {
  return res.json(buildSummary());
});

app.get("/api/dashboard/recent", authRequired, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT *
      FROM (
        SELECT s.id, s.date, 'PENYEMPROTAN' AS activity_type, s.crop AS detail, s.location, s.note,
               NULL AS qty, NULL AS unit, u.name AS created_by_name, s.created_at
        FROM spray_logs s
        JOIN users u ON u.id = s.created_by

        UNION ALL

        SELECT p.id, p.date, 'PENANAMAN' AS activity_type, p.crop AS detail, p.location, p.note,
               NULL AS qty, NULL AS unit, u.name AS created_by_name, p.created_at
        FROM planting_logs p
        JOIN users u ON u.id = p.created_by

        UNION ALL

        SELECT h.id, h.date, 'PANEN' AS activity_type, h.harvest_type AS detail, h.location, h.note,
               h.qty, h.unit, u.name AS created_by_name, h.created_at
        FROM harvest_logs h
        JOIN users u ON u.id = h.created_by
      ) all_logs
      ORDER BY datetime(created_at) DESC
      LIMIT 10
    `)
    .all();

  return res.json({ items: rows });
});

app.get("/api/sprays", authRequired, (req, res) => {
  const { startDate, endDate, crop, location } = req.query;
  const params = [];
  const clauses = [];

  const start = startDate ? toISODate(startDate) : null;
  const end = endDate ? toISODate(endDate) : null;
  if (startDate && !start) {
    return res.status(400).json({ message: "Format startDate tidak valid." });
  }
  if (endDate && !end) {
    return res.status(400).json({ message: "Format endDate tidak valid." });
  }

  applyDateFilter(clauses, params, "s.date", start, end);

  if (crop && crop !== "ALL") {
    if (!cropValid(crop)) {
      return res.status(400).json({ message: "Nilai crop tidak valid." });
    }
    clauses.push("s.crop = ?");
    params.push(crop);
  }

  if (location) {
    clauses.push("LOWER(s.location) LIKE ?");
    params.push(`%${String(location).toLowerCase()}%`);
  }

  let query = `${withUserName("spray_logs", "s")}`;
  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " ORDER BY s.date DESC, s.id DESC";

  const items = db.prepare(query).all(...params);
  return res.json({ items });
});

app.post("/api/sprays", authRequired, (req, res) => {
  const note = String(req.body.note || "").trim();
  const crop = String(req.body.crop || "").trim();
  const date = toISODate(req.body.date);
  const location = String(req.body.location || "").trim();

  if (!note) {
    return res.status(400).json({ message: "Catatan wajib diisi." });
  }
  if (!cropValid(crop)) {
    return res.status(400).json({ message: "Tanaman wajib Horenso atau Terong." });
  }
  if (!date) {
    return res.status(400).json({ message: "Tanggal wajib diisi dengan format YYYY-MM-DD." });
  }
  if (!location) {
    return res.status(400).json({ message: "Tempat wajib diisi." });
  }

  const result = db
    .prepare(
      "INSERT INTO spray_logs (date, crop, location, note, created_by, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .run(date, crop, location, note, req.user.id);

  const item = db
    .prepare(`${withUserName("spray_logs", "s")} WHERE s.id = ?`)
    .get(result.lastInsertRowid);

  return res.status(201).json({ item });
});

app.put("/api/sprays/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const note = String(req.body.note || "").trim();
  const crop = String(req.body.crop || "").trim();
  const date = toISODate(req.body.date);
  const location = String(req.body.location || "").trim();

  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }
  if (!note || !cropValid(crop) || !date || !location) {
    return res.status(400).json({ message: "Field spray tidak lengkap atau tidak valid." });
  }

  const result = db
    .prepare(
      "UPDATE spray_logs SET date = ?, crop = ?, location = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(date, crop, location, note, id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  const item = db.prepare(`${withUserName("spray_logs", "s")} WHERE s.id = ?`).get(id);
  return res.json({ item });
});

app.delete("/api/sprays/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }

  const result = db.prepare("DELETE FROM spray_logs WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  return res.json({ ok: true });
});

app.get("/api/plantings", authRequired, (req, res) => {
  const { startDate, endDate, crop, location } = req.query;
  const params = [];
  const clauses = [];

  const start = startDate ? toISODate(startDate) : null;
  const end = endDate ? toISODate(endDate) : null;
  if (startDate && !start) {
    return res.status(400).json({ message: "Format startDate tidak valid." });
  }
  if (endDate && !end) {
    return res.status(400).json({ message: "Format endDate tidak valid." });
  }

  applyDateFilter(clauses, params, "p.date", start, end);

  if (crop && crop !== "ALL") {
    if (!cropValid(crop)) {
      return res.status(400).json({ message: "Nilai crop tidak valid." });
    }
    clauses.push("p.crop = ?");
    params.push(crop);
  }

  if (location) {
    clauses.push("LOWER(p.location) LIKE ?");
    params.push(`%${String(location).toLowerCase()}%`);
  }

  let query = `${withUserName("planting_logs", "p")}`;
  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " ORDER BY p.date DESC, p.id DESC";

  const items = db.prepare(query).all(...params);
  return res.json({ items });
});

app.post("/api/plantings", authRequired, (req, res) => {
  const note = String(req.body.note || "").trim();
  const crop = String(req.body.crop || "").trim();
  const date = toISODate(req.body.date);
  const location = String(req.body.location || "").trim();

  if (!note) {
    return res.status(400).json({ message: "Catatan wajib diisi." });
  }
  if (!cropValid(crop)) {
    return res.status(400).json({ message: "Tanaman wajib Horenso atau Terong." });
  }
  if (!date) {
    return res.status(400).json({ message: "Tanggal wajib valid." });
  }
  if (!location) {
    return res.status(400).json({ message: "Tempat wajib diisi." });
  }

  const result = db
    .prepare(
      "INSERT INTO planting_logs (date, crop, location, note, created_by, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .run(date, crop, location, note, req.user.id);

  const item = db
    .prepare(`${withUserName("planting_logs", "p")} WHERE p.id = ?`)
    .get(result.lastInsertRowid);

  return res.status(201).json({ item });
});

app.put("/api/plantings/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const note = String(req.body.note || "").trim();
  const crop = String(req.body.crop || "").trim();
  const date = toISODate(req.body.date);
  const location = String(req.body.location || "").trim();

  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }
  if (!note || !cropValid(crop) || !date || !location) {
    return res.status(400).json({ message: "Field penanaman tidak lengkap atau tidak valid." });
  }

  const result = db
    .prepare(
      "UPDATE planting_logs SET date = ?, crop = ?, location = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(date, crop, location, note, id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  const item = db.prepare(`${withUserName("planting_logs", "p")} WHERE p.id = ?`).get(id);
  return res.json({ item });
});

app.delete("/api/plantings/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }

  const result = db.prepare("DELETE FROM planting_logs WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  return res.json({ ok: true });
});

app.get("/api/harvests", authRequired, (req, res) => {
  const { startDate, endDate, harvestType, location } = req.query;
  const params = [];
  const clauses = [];

  const start = startDate ? toISODate(startDate) : null;
  const end = endDate ? toISODate(endDate) : null;
  if (startDate && !start) {
    return res.status(400).json({ message: "Format startDate tidak valid." });
  }
  if (endDate && !end) {
    return res.status(400).json({ message: "Format endDate tidak valid." });
  }

  applyDateFilter(clauses, params, "h.date", start, end);

  if (harvestType && harvestType !== "ALL") {
    if (!harvestTypeValid(harvestType)) {
      return res.status(400).json({ message: "Jenis panen tidak valid." });
    }
    clauses.push("h.harvest_type = ?");
    params.push(harvestType);
  }

  if (location) {
    clauses.push("LOWER(h.location) LIKE ?");
    params.push(`%${String(location).toLowerCase()}%`);
  }

  let query = `${withUserName("harvest_logs", "h")}`;
  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " ORDER BY h.date DESC, h.id DESC";

  const items = db.prepare(query).all(...params);
  return res.json({ items });
});

app.post("/api/harvests", authRequired, (req, res) => {
  const harvestType = String(req.body.harvestType || "").trim();
  const date = toISODate(req.body.date);
  const qty = parseNumber(req.body.qty);
  let unit = String(req.body.unit || "").trim().toLowerCase();
  const location = String(req.body.location || "").trim();
  const note = String(req.body.note || "").trim();

  if (!harvestTypeValid(harvestType)) {
    return res.status(400).json({ message: "Jenis panen tidak valid." });
  }
  if (!date) {
    return res.status(400).json({ message: "Tanggal wajib valid." });
  }
  if (qty === null || qty < 0) {
    return res.status(400).json({ message: "Jumlah wajib angka >= 0." });
  }

  if (harvestType === "KONTENER_HORENSO") {
    unit = "kontainer";
  } else if (!unit) {
    unit = "kg";
  }

  const result = db
    .prepare(
      "INSERT INTO harvest_logs (date, harvest_type, qty, unit, location, note, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .run(date, harvestType, qty, unit, location, note, req.user.id);

  const item = db
    .prepare(`${withUserName("harvest_logs", "h")} WHERE h.id = ?`)
    .get(result.lastInsertRowid);

  return res.status(201).json({ item });
});

app.put("/api/harvests/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  const harvestType = String(req.body.harvestType || "").trim();
  const date = toISODate(req.body.date);
  const qty = parseNumber(req.body.qty);
  let unit = String(req.body.unit || "").trim().toLowerCase();
  const location = String(req.body.location || "").trim();
  const note = String(req.body.note || "").trim();

  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }
  if (!harvestTypeValid(harvestType) || !date || qty === null || qty < 0) {
    return res.status(400).json({ message: "Field panen tidak lengkap atau tidak valid." });
  }

  if (harvestType === "KONTENER_HORENSO") {
    unit = "kontainer";
  } else if (!unit) {
    unit = "kg";
  }

  const result = db
    .prepare(
      "UPDATE harvest_logs SET date = ?, harvest_type = ?, qty = ?, unit = ?, location = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(date, harvestType, qty, unit, location, note, id);

  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  const item = db.prepare(`${withUserName("harvest_logs", "h")} WHERE h.id = ?`).get(id);
  return res.json({ item });
});

app.delete("/api/harvests/:id", authRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ message: "ID tidak valid." });
  }

  const result = db.prepare("DELETE FROM harvest_logs WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: "Data tidak ditemukan." });
  }

  return res.json({ ok: true });
});

app.get("/api/charts/harvest-daily", authRequired, (req, res) => {
  const { startDate, endDate, harvestType } = req.query;

  const start = startDate ? toISODate(startDate) : null;
  const end = endDate ? toISODate(endDate) : null;
  if (startDate && !start) {
    return res.status(400).json({ message: "Format startDate tidak valid." });
  }
  if (endDate && !end) {
    return res.status(400).json({ message: "Format endDate tidak valid." });
  }

  if (harvestType && harvestType !== "ALL") {
    if (!harvestTypeValid(harvestType)) {
      return res.status(400).json({ message: "Jenis panen tidak valid." });
    }
  }
  const items = getHarvestDailyItems(start, end, harvestType);
  return res.json({ items });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Terjadi kesalahan server." });
});

app.listen(PORT, () => {
  console.log(`Kebun Log Dashboard running at http://localhost:${PORT}`);
  console.log(`Default login: ${defaultAdminEmail} / admin123`);
});
