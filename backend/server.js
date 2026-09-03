require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");
const { calcDuration } = db;

const app = express();
const ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: ORIGIN === "*" ? true : ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json());

// Süreyi insan okunabilir biçime çevirme (Örn: 2 sa 30 dk)
function formatDuration(min) {
  if (!min || isNaN(min)) return "0 dk";
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  if (hours > 0 && minutes > 0) return `${hours} sa ${minutes} dk`;
  if (hours > 0) return `${hours} sa`;
  return `${minutes} dk`;
}

// Ortak filtre oluşturucu
function buildWhereClause(query) {
  const { from, to, q, department, employee } = query;
  const clauses = [];
  const params = {};

  if (from) {
    clauses.push("date >= @from");
    params.from = from;
  }
  if (to) {
    clauses.push("date <= @to");
    params.to = to;
  }
  if (department) {
    clauses.push("department LIKE @dep");
    params.dep = `%${department}%`;
  }
  if (employee) {
    clauses.push("employee LIKE @emp");
    params.emp = `%${employee}%`;
  }
  if (q) {
    clauses.push("(employee LIKE @q OR department LIKE @q OR location LIKE @q)");
    params.q = `%${q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { where, params };
}

// Sağlık kontrolü
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Kayıtları listeleme
app.get("/api/entries", (req, res) => {
  try {
    const { where, params } = buildWhereClause(req.query);
    const rows = db
      .prepare(
        `SELECT id, date, employee, department, startTime, endTime, durationMin, location, createdAt, updatedAt
         FROM overtime_entries ${where}
         ORDER BY date DESC, id DESC`
      )
      .all(params);
    res.json(rows);
  } catch (err) {
    console.error("Listeleme hatası:", err);
    res.status(500).json({ error: "Kayıtlar listelenirken bir hata oluştu: " + err.message });
  }
});

// Yeni kayıt ekleme
app.post("/api/entries", (req, res) => {
  try {
    const b = req.body;
    if (!b.date || !b.employee || !b.department || !b.startTime || !b.endTime) {
      return res.status(400).json({ error: "Zorunlu alanlar eksik (Tarih, Çalışan, Bölüm, Başlangıç, Bitiş)." });
    }
    const now = new Date().toISOString();
    const durationMin = calcDuration(b.startTime, b.endTime);

    const stmt = db.prepare(`
      INSERT INTO overtime_entries
      (date, employee, department, startTime, endTime, durationMin, location, createdAt, updatedAt)
      VALUES (@date, @employee, @department, @startTime, @endTime, @durationMin, @location, @now, @now)
    `);

    const info = stmt.run({
      date: b.date,
      employee: b.employee.trim(),
      department: b.department.trim(),
      startTime: b.startTime,
      endTime: b.endTime,
      durationMin,
      location: (b.location || "").trim(),
      now,
    });

    res.status(201).json({ id: info.lastInsertRowid, durationMin });
  } catch (err) {
    console.error("Ekleme hatası:", err);
    res.status(500).json({ error: "Kayıt eklenirken bir hata oluştu: " + err.message });
  }
});

// Kayıt güncelleme
app.put("/api/entries/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Geçersiz kayıt ID." });

    const b = req.body;
    if (!b.date || !b.employee || !b.department || !b.startTime || !b.endTime) {
      return res.status(400).json({ error: "Zorunlu alanlar eksik (Tarih, Çalışan, Bölüm, Başlangıç, Bitiş)." });
    }

    const now = new Date().toISOString();
    const durationMin = calcDuration(b.startTime, b.endTime);

    const result = db
      .prepare(
        `UPDATE overtime_entries SET
          date = @date,
          employee = @employee,
          department = @department,
          startTime = @startTime,
          endTime = @endTime,
          durationMin = @durationMin,
          location = @location,
          updatedAt = @now
        WHERE id = @id`
      )
      .run({
        id,
        date: b.date,
        employee: b.employee.trim(),
        department: b.department.trim(),
        startTime: b.startTime,
        endTime: b.endTime,
        durationMin,
        location: (b.location || "").trim(),
        now,
      });

    if (result.changes === 0) {
      return res.status(404).json({ error: "Güncellenecek kayıt bulunamadı." });
    }

    res.json({ ok: true, durationMin });
  } catch (err) {
    console.error("Güncelleme hatası:", err);
    res.status(500).json({ error: "Kayıt güncellenirken bir hata oluştu: " + err.message });
  }
});

// Kayıt silme
app.delete("/api/entries/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Geçersiz kayıt ID." });

    const result = db.prepare(`DELETE FROM overtime_entries WHERE id = ?`).run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Silinecek kayıt bulunamadı." });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Silme hatası:", err);
    res.status(500).json({ error: "Kayıt silinirken bir hata oluştu: " + err.message });
  }
});

// CSV Dışa Aktarma (Filtre destekli + UTF-8 BOM ile Excel uyumlu Türkçe karakterler)
app.get("/api/export.csv", (req, res) => {
  try {
    const { where, params } = buildWhereClause(req.query);
    const rows = db
      .prepare(
        `SELECT id, date, employee, department, startTime, endTime, durationMin, location, createdAt
         FROM overtime_entries ${where}
         ORDER BY date DESC, id DESC`
      )
      .all(params);

    const headers = ["ID", "Tarih", "Çalışan", "Bölüm", "Başlangıç", "Bitiş", "Süre (Dk)", "Süre", "Durak/Lokasyon", "Oluşturulma"];
    
    const csvRows = [headers.join(";")];
    for (const r of rows) {
      const formatted = [
        r.id,
        r.date,
        `"${(r.employee || "").replace(/"/g, '""')}"`,
        `"${(r.department || "").replace(/"/g, '""')}"`,
        r.startTime,
        r.endTime,
        r.durationMin || 0,
        `"${formatDuration(r.durationMin)}"`,
        `"${(r.location || "").replace(/"/g, '""')}"`,
        r.createdAt,
      ];
      csvRows.push(formatted.join(";"));
    }

    // \uFEFF UTF-8 BOM ekleyerek Excel'in Türkçe karakterleri doğru tanımasını sağlıyoruz
    const csvContent = "\uFEFF" + csvRows.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="fazla-mesai.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error("CSV aktarma hatası:", err);
    res.status(500).json({ error: "CSV dosyası oluşturulamadı: " + err.message });
  }
});

// Excel Dışa Aktarma (XLSX - Filtre destekli)
app.get("/api/export.xlsx", (req, res) => {
  try {
    const xlsx = require("xlsx");
    const { where, params } = buildWhereClause(req.query);
    const rows = db
      .prepare(
        `SELECT id, date, employee, department, startTime, endTime, durationMin, location, createdAt
         FROM overtime_entries ${where}
         ORDER BY date DESC, id DESC`
      )
      .all(params);

    const headers = ["ID", "Tarih", "Çalışan", "Bölüm", "Başlangıç", "Bitiş", "Süre (Dk)", "Süre", "Durak/Lokasyon", "Oluşturulma"];
    const data = [
      headers,
      ...rows.map((r) => [
        r.id,
        r.date,
        r.employee,
        r.department,
        r.startTime,
        r.endTime,
        r.durationMin || 0,
        formatDuration(r.durationMin),
        r.location || "-",
        r.createdAt,
      ]),
    ];

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(data);

    // Sütun genişlikleri
    ws["!cols"] = [
      { wch: 6 },  // ID
      { wch: 12 }, // Tarih
      { wch: 22 }, // Çalışan
      { wch: 16 }, // Bölüm
      { wch: 10 }, // Başlangıç
      { wch: 10 }, // Bitiş
      { wch: 10 }, // Süre (Dk)
      { wch: 14 }, // Süre
      { wch: 20 }, // Durak
      { wch: 24 }, // Oluşturulma
    ];

    xlsx.utils.book_append_sheet(wb, ws, "Fazla Mesai");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="fazla-mesai.xlsx"');
    res.send(buf);
  } catch (err) {
    console.error("Excel aktarma hatası:", err);
    res.status(500).json({ error: "Excel dosyası oluşturulamadı: " + err.message });
  }
});

const PORT = process.env.PORT || 5174;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`API listening on http://${HOST}:${PORT}`));
