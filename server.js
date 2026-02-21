const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "kebun_dashboard_secret_change_me";
const COOKIE_NAME = "kebun_token";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({
  connectionString: DATABASE_URL || undefined,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

const defaultAdminEmail = "admin@kebun.local";
const defaultAdminPassword = "admin123";

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

function cropValid(crop) {
  return crop === "HORENSO" || crop === "TERONG" || crop === "KONYAKU";
}

function harvestTypeValid(type) {
  return type === "HORENSO" || type === "TERONG" || type === "KONYAKU" || type === "KONTENER_HORENSO";
}

function harvestUnitValid(unit) {
  return unit === "kardus" || unit === "kontainer";
}

function withUserName(table, alias, extraColumns) {
  return `SELECT ${alias}.*, u.name AS created_by_name ${extraColumns ? `, ${extraColumns}` : ""}
          FROM ${table} ${alias}
          JOIN users u ON u.id = ${alias}.created_by`;
}

function pushCondition(clauses, params, sqlWithPlaceholder, value) {
  params.push(value);
  clauses.push(sqlWithPlaceholder.replace("?", `$${params.length}`));
}

async function initializeDatabase() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL belum di-set. Gunakan Neon connection string.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS spray_logs (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      crop TEXT NOT NULL,
      location TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS planting_logs (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      crop TEXT NOT NULL,
      location TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS harvest_logs (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      harvest_type TEXT NOT NULL,
      qty DOUBLE PRECISION NOT NULL,
      unit TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_by BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [defaultAdminEmail]);
  if (existing.rowCount === 0) {
    const passwordHash = bcrypt.hashSync(defaultAdminPassword, 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      ["Admin Kebun", defaultAdminEmail, passwordHash, "ADMIN"]
    );
  }
}

const dbReady = initializeDatabase();

app.use("/api", async (_req, _res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    next(error);
  }
});

function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: "Belum login." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Sesi tidak valid. Silakan login lagi." });
  }
}

async function buildSummary() {
  const today = toISODate();
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStart = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(
    weekStartDate.getDate()
  ).padStart(2, "0")}`;

  const sprayToday = await pool.query("SELECT COUNT(*)::int AS total FROM spray_logs WHERE date = $1", [today]);
  const plantingToday = await pool.query("SELECT COUNT(*)::int AS total FROM planting_logs WHERE date = $1", [today]);
  const harvestToday = await pool.query(
    "SELECT COALESCE(SUM(qty), 0)::double precision AS total FROM harvest_logs WHERE date = $1",
    [today]
  );
  const harvestWeek = await pool.query(
    "SELECT COALESCE(SUM(qty), 0)::double precision AS total FROM harvest_logs WHERE date >= $1 AND date <= $2",
    [weekStart, today]
  );

  return {
    today,
    summary: {
      sprayToday: Number(sprayToday.rows[0]?.total || 0),
      plantingToday: Number(plantingToday.rows[0]?.total || 0),
      harvestToday: Number(harvestToday.rows[0]?.total || 0),
      harvestWeek: Number(harvestWeek.rows[0]?.total || 0),
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

async function getHarvestDailyItems(startDate, endDate, harvestType) {
  const clauses = [];
  const params = [];

  if (startDate) {
    pushCondition(clauses, params, "date >= ?", startDate);
  }
  if (endDate) {
    pushCondition(clauses, params, "date <= ?", endDate);
  }
  if (harvestType && harvestType !== "ALL") {
    pushCondition(clauses, params, "harvest_type = ?", harvestType);
  }

  let query = "SELECT date::text AS date, ROUND(COALESCE(SUM(qty), 0)::numeric, 2) AS total_qty FROM harvest_logs";
  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(" AND ")}`;
  }
  query += " GROUP BY date ORDER BY date ASC";

  const rows = await pool.query(query, params);
  return rows.rows.map((item) => ({ ...item, total_qty: Number(item.total_qty) }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/public/summary", async (_req, res, next) => {
  try {
    res.json(await buildSummary());
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/sprays", async (_req, res, next) => {
  try {
    const rows = await pool.query(
      "SELECT date::text AS date, crop, location, note FROM spray_logs ORDER BY date DESC, id DESC LIMIT 20"
    );
    res.json({ items: rows.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/plantings", async (_req, res, next) => {
  try {
    const rows = await pool.query(
      "SELECT date::text AS date, crop, location, note FROM planting_logs ORDER BY date DESC, id DESC LIMIT 20"
    );
    res.json({ items: rows.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/harvests", async (_req, res, next) => {
  try {
    const rows = await pool.query(
      "SELECT date::text AS date, harvest_type, qty, unit, location, note FROM harvest_logs ORDER BY date DESC, id DESC LIMIT 20"
    );
    res.json({
      items: rows.rows.map((item) => ({ ...item, qty: Number(item.qty) })),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/charts/harvest-daily", async (req, res, next) => {
  try {
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

    const items = await getHarvestDailyItems(start, end, harvestType);
    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid." });
    }
    if (!password) {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    const userResult = await pool.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    const user = userResult.rows[0];

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
  } catch (error) {
    next(error);
  }
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

app.get("/api/dashboard/summary", authRequired, async (_req, res, next) => {
  try {
    return res.json(await buildSummary());
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard/recent", authRequired, async (_req, res, next) => {
  try {
    const rows = await pool.query(`
      SELECT *
      FROM (
        SELECT s.id, s.date::text AS date, 'PENYEMPROTAN' AS activity_type, s.crop AS detail, s.location, s.note,
               NULL::double precision AS qty, NULL::text AS unit, u.name AS created_by_name, s.created_at
        FROM spray_logs s
        JOIN users u ON u.id = s.created_by

        UNION ALL

        SELECT p.id, p.date::text AS date, 'PENANAMAN' AS activity_type, p.crop AS detail, p.location, p.note,
               NULL::double precision AS qty, NULL::text AS unit, u.name AS created_by_name, p.created_at
        FROM planting_logs p
        JOIN users u ON u.id = p.created_by

        UNION ALL

        SELECT h.id, h.date::text AS date, 'PANEN' AS activity_type, h.harvest_type AS detail, h.location, h.note,
               h.qty, h.unit, u.name AS created_by_name, h.created_at
        FROM harvest_logs h
        JOIN users u ON u.id = h.created_by
      ) all_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const items = rows.rows.map((item) => ({
      ...item,
      qty: item.qty === null || item.qty === undefined ? null : Number(item.qty),
    }));

    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/sprays", authRequired, async (req, res, next) => {
  try {
    const { startDate, endDate, crop, location } = req.query;
    const clauses = [];
    const params = [];

    const start = startDate ? toISODate(startDate) : null;
    const end = endDate ? toISODate(endDate) : null;
    if (startDate && !start) {
      return res.status(400).json({ message: "Format startDate tidak valid." });
    }
    if (endDate && !end) {
      return res.status(400).json({ message: "Format endDate tidak valid." });
    }

    if (start) {
      pushCondition(clauses, params, "s.date >= ?", start);
    }
    if (end) {
      pushCondition(clauses, params, "s.date <= ?", end);
    }

    if (crop && crop !== "ALL") {
      if (!cropValid(crop)) {
        return res.status(400).json({ message: "Nilai crop tidak valid." });
      }
      pushCondition(clauses, params, "s.crop = ?", crop);
    }

    if (location) {
      pushCondition(clauses, params, "s.location ILIKE ?", `%${String(location)}%`);
    }

    let query = `${withUserName("spray_logs", "s", "s.date::text AS date")}`;
    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(" AND ")}`;
    }
    query += " ORDER BY s.date DESC, s.id DESC";

    const rows = await pool.query(query, params);
    return res.json({ items: rows.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/sprays", authRequired, async (req, res, next) => {
  try {
    const note = String(req.body.note || "").trim();
    const crop = String(req.body.crop || "").trim();
    const date = toISODate(req.body.date);
    const location = String(req.body.location || "").trim();

    if (!note) {
      return res.status(400).json({ message: "Catatan wajib diisi." });
    }
    if (!cropValid(crop)) {
      return res.status(400).json({ message: "Tanaman wajib Horenso, Terong, atau Konyaku." });
    }
    if (!date) {
      return res.status(400).json({ message: "Tanggal wajib diisi dengan format YYYY-MM-DD." });
    }
    if (!location) {
      return res.status(400).json({ message: "Tempat wajib diisi." });
    }

    const inserted = await pool.query(
      "INSERT INTO spray_logs (date, crop, location, note, created_by, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
      [date, crop, location, note, req.user.id]
    );

    const row = await pool.query(`${withUserName("spray_logs", "s", "s.date::text AS date")} WHERE s.id = $1`, [
      inserted.rows[0].id,
    ]);

    return res.status(201).json({ item: row.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/sprays/:id", authRequired, async (req, res, next) => {
  try {
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

    const updated = await pool.query(
      "UPDATE spray_logs SET date = $1, crop = $2, location = $3, note = $4, updated_at = NOW() WHERE id = $5",
      [date, crop, location, note, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    const row = await pool.query(`${withUserName("spray_logs", "s", "s.date::text AS date")} WHERE s.id = $1`, [id]);
    return res.json({ item: row.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/sprays/:id", authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID tidak valid." });
    }

    const deleted = await pool.query("DELETE FROM spray_logs WHERE id = $1", [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/plantings", authRequired, async (req, res, next) => {
  try {
    const { startDate, endDate, crop, location } = req.query;
    const clauses = [];
    const params = [];

    const start = startDate ? toISODate(startDate) : null;
    const end = endDate ? toISODate(endDate) : null;
    if (startDate && !start) {
      return res.status(400).json({ message: "Format startDate tidak valid." });
    }
    if (endDate && !end) {
      return res.status(400).json({ message: "Format endDate tidak valid." });
    }

    if (start) {
      pushCondition(clauses, params, "p.date >= ?", start);
    }
    if (end) {
      pushCondition(clauses, params, "p.date <= ?", end);
    }

    if (crop && crop !== "ALL") {
      if (!cropValid(crop)) {
        return res.status(400).json({ message: "Nilai crop tidak valid." });
      }
      pushCondition(clauses, params, "p.crop = ?", crop);
    }

    if (location) {
      pushCondition(clauses, params, "p.location ILIKE ?", `%${String(location)}%`);
    }

    let query = `${withUserName("planting_logs", "p", "p.date::text AS date")}`;
    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(" AND ")}`;
    }
    query += " ORDER BY p.date DESC, p.id DESC";

    const rows = await pool.query(query, params);
    return res.json({ items: rows.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/plantings", authRequired, async (req, res, next) => {
  try {
    const note = String(req.body.note || "").trim();
    const crop = String(req.body.crop || "").trim();
    const date = toISODate(req.body.date);
    const location = String(req.body.location || "").trim();

    if (!note) {
      return res.status(400).json({ message: "Catatan wajib diisi." });
    }
    if (!cropValid(crop)) {
      return res.status(400).json({ message: "Tanaman wajib Horenso, Terong, atau Konyaku." });
    }
    if (!date) {
      return res.status(400).json({ message: "Tanggal wajib valid." });
    }
    if (!location) {
      return res.status(400).json({ message: "Tempat wajib diisi." });
    }

    const inserted = await pool.query(
      "INSERT INTO planting_logs (date, crop, location, note, created_by, updated_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id",
      [date, crop, location, note, req.user.id]
    );

    const row = await pool.query(`${withUserName("planting_logs", "p", "p.date::text AS date")} WHERE p.id = $1`, [
      inserted.rows[0].id,
    ]);

    return res.status(201).json({ item: row.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/plantings/:id", authRequired, async (req, res, next) => {
  try {
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

    const updated = await pool.query(
      "UPDATE planting_logs SET date = $1, crop = $2, location = $3, note = $4, updated_at = NOW() WHERE id = $5",
      [date, crop, location, note, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    const row = await pool.query(`${withUserName("planting_logs", "p", "p.date::text AS date")} WHERE p.id = $1`, [id]);
    return res.json({ item: row.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/plantings/:id", authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID tidak valid." });
    }

    const deleted = await pool.query("DELETE FROM planting_logs WHERE id = $1", [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/harvests", authRequired, async (req, res, next) => {
  try {
    const { startDate, endDate, harvestType, location } = req.query;
    const clauses = [];
    const params = [];

    const start = startDate ? toISODate(startDate) : null;
    const end = endDate ? toISODate(endDate) : null;
    if (startDate && !start) {
      return res.status(400).json({ message: "Format startDate tidak valid." });
    }
    if (endDate && !end) {
      return res.status(400).json({ message: "Format endDate tidak valid." });
    }

    if (start) {
      pushCondition(clauses, params, "h.date >= ?", start);
    }
    if (end) {
      pushCondition(clauses, params, "h.date <= ?", end);
    }

    if (harvestType && harvestType !== "ALL") {
      if (!harvestTypeValid(harvestType)) {
        return res.status(400).json({ message: "Jenis panen tidak valid." });
      }
      pushCondition(clauses, params, "h.harvest_type = ?", harvestType);
    }

    if (location) {
      pushCondition(clauses, params, "h.location ILIKE ?", `%${String(location)}%`);
    }

    let query = `${withUserName("harvest_logs", "h", "h.date::text AS date")}`;
    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(" AND ")}`;
    }
    query += " ORDER BY h.date DESC, h.id DESC";

    const rows = await pool.query(query, params);
    return res.json({
      items: rows.rows.map((item) => ({ ...item, qty: Number(item.qty) })),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/harvests", authRequired, async (req, res, next) => {
  try {
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
      unit = "kardus";
    }

    if (!harvestUnitValid(unit)) {
      return res.status(400).json({ message: "Satuan panen harus kardus atau kontainer." });
    }

    const inserted = await pool.query(
      "INSERT INTO harvest_logs (date, harvest_type, qty, unit, location, note, created_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id",
      [date, harvestType, qty, unit, location, note, req.user.id]
    );

    const row = await pool.query(`${withUserName("harvest_logs", "h", "h.date::text AS date")} WHERE h.id = $1`, [
      inserted.rows[0].id,
    ]);

    return res.status(201).json({ item: { ...row.rows[0], qty: Number(row.rows[0].qty) } });
  } catch (error) {
    next(error);
  }
});

app.put("/api/harvests/:id", authRequired, async (req, res, next) => {
  try {
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
      unit = "kardus";
    }

    if (!harvestUnitValid(unit)) {
      return res.status(400).json({ message: "Satuan panen harus kardus atau kontainer." });
    }

    const updated = await pool.query(
      "UPDATE harvest_logs SET date = $1, harvest_type = $2, qty = $3, unit = $4, location = $5, note = $6, updated_at = NOW() WHERE id = $7",
      [date, harvestType, qty, unit, location, note, id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    const row = await pool.query(`${withUserName("harvest_logs", "h", "h.date::text AS date")} WHERE h.id = $1`, [id]);
    return res.json({ item: { ...row.rows[0], qty: Number(row.rows[0].qty) } });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/harvests/:id", authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID tidak valid." });
    }

    const deleted = await pool.query("DELETE FROM harvest_logs WHERE id = $1", [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan." });
    }

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/charts/harvest-daily", authRequired, async (req, res, next) => {
  try {
    const { startDate, endDate, harvestType } = req.query;

    const start = startDate ? toISODate(startDate) : null;
    const end = endDate ? toISODate(endDate) : null;
    if (startDate && !start) {
      return res.status(400).json({ message: "Format startDate tidak valid." });
    }
    if (endDate && !end) {
      return res.status(400).json({ message: "Format endDate tidak valid." });
    }

    if (harvestType && harvestType !== "ALL" && !harvestTypeValid(harvestType)) {
      return res.status(400).json({ message: "Jenis panen tidak valid." });
    }

    const items = await getHarvestDailyItems(start, end, harvestType);
    return res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Terjadi kesalahan server." });
});

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Kebun Log Dashboard running at http://localhost:${PORT}`);
        console.log(`Default login: ${defaultAdminEmail} / ${defaultAdminPassword}`);
      });
    })
    .catch((error) => {
      console.error("Gagal inisialisasi database:", error.message);
      process.exit(1);
    });
}

module.exports = app;
