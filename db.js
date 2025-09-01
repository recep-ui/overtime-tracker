// backend/db.js
const Database = require("better-sqlite3");
const db = new Database("data.db");

db.exec(`
CREATE TABLE IF NOT EXISTS overtime_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  employee TEXT NOT NULL,
  department TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  durationMin INTEGER NOT NULL,
  location TEXT,
  reason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);

module.exports = db;
