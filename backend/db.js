const Database = require("better-sqlite3");
const path = require("path");

function calcDuration(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let s = (sh || 0) * 60 + (sm || 0);
  let e = (eh || 0) * 60 + (em || 0);
  if (e < s) e += 24 * 60; // gece devri
  return Math.max(0, e - s);
}

const rawDbPath = process.env.DB_PATH;
let resolvedDbPath;
if (rawDbPath) {
  if (path.isAbsolute(rawDbPath)) {
    resolvedDbPath = rawDbPath;
  } else {
    resolvedDbPath = path.resolve(process.cwd(), rawDbPath);
  }
} else {
  resolvedDbPath = path.join(__dirname, "data.db");
}

const db = new Database(resolvedDbPath);

// Tabloyu oluştur (durationMin dahil)
db.exec(`
CREATE TABLE IF NOT EXISTS overtime_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  employee TEXT NOT NULL,
  department TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  durationMin INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);

// durationMin kolonu yoksa otomatik ekle (migration)
try {
  const columns = db.prepare("PRAGMA table_info(overtime_entries)").all();
  const hasDuration = columns.some((c) => c.name === "durationMin");
  if (!hasDuration) {
    db.exec("ALTER TABLE overtime_entries ADD COLUMN durationMin INTEGER NOT NULL DEFAULT 0");
  }
} catch (err) {
  console.warn("durationMin sütunu kontrol edilirken uyarı:", err.message);
}

// Boş veya hesaplanmamış durationMin değerlerini güncelle
try {
  const uncalc = db.prepare("SELECT id, startTime, endTime FROM overtime_entries WHERE durationMin IS NULL OR durationMin = 0").all();
  if (uncalc.length > 0) {
    const updateStmt = db.prepare("UPDATE overtime_entries SET durationMin = ? WHERE id = ?");
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        updateStmt.run(calcDuration(r.startTime, r.endTime), r.id);
      }
    });
    tx(uncalc);
  }
} catch (err) {
  console.warn("Kayıt süreleri güncellenirken uyarı:", err.message);
}

module.exports = db;
module.exports.calcDuration = calcDuration;
