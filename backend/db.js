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
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);

// NOT: Eski veritabanında 'reason' kolonu varsa (eski oluşturulmuşsa) kalır, artık kullanılmıyor.
// Tamamen kaldırmak için 'data.db' dosyasını silip uygulamayı yeniden başlatabilirsiniz (veri kaybı olur),
// ya da manuel migration yapabilirsiniz.

module.exports = db;
