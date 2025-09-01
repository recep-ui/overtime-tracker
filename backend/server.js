const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

function durationMinOf(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let s = sh * 60 + sm, e = eh * 60 + em;
  if (e < s) e += 24 * 60;
  return e - s;
}

app.get("/api/entries", (req, res) => {
  const { from, to, q, department, employee } = req.query;
  const clauses = [];
  const params = {};
  if (from) { clauses.push("date >= @from"); params.from = from; }
  if (to)   { clauses.push("date <= @to");   params.to = to; }
  if (department) { clauses.push("department LIKE @dep"); params.dep = `%${department}%`; }
  if (employee)   { clauses.push("employee LIKE @emp");   params.emp = `%${employee}%`; }
  if (q) { clauses.push("(employee LIKE @q OR department LIKE @q OR location LIKE @q)"); params.q = `%${q}%`; }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT id,date,employee,department,startTime,endTime,durationMin,location,createdAt,updatedAt FROM overtime_entries ${where} ORDER BY date DESC, id DESC`).all(params);
  res.json(rows);
});

app.post("/api/entries", (req, res) => {
  const b = req.body;
  if (!b.date || !b.employee || !b.department || !b.startTime || !b.endTime) {
    return res.status(400).json({ error: "Zorunlu alanlar eksik." });
  }
  const now = new Date().toISOString();
  const dur = durationMinOf(b.startTime, b.endTime);
  const stmt = db.prepare(`
    INSERT INTO overtime_entries
    (date, employee, department, startTime, endTime, durationMin, location, createdAt, updatedAt)
    VALUES (@date, @employee, @department, @startTime, @endTime, @dur, @location, @now, @now)
  `);
  const info = stmt.run({ ...b, dur, now });
  res.json({ id: info.lastInsertRowid });
});

app.put("/api/entries/:id", (req, res) => {
  const id = Number(req.params.id);
  const b = req.body;
  if (!b.date || !b.employee || !b.department || !b.startTime || !b.endTime) {
    return res.status(400).json({ error: "Zorunlu alanlar eksik." });
  }
  const now = new Date().toISOString();
  const dur = durationMinOf(b.startTime, b.endTime);
  db.prepare(`
    UPDATE overtime_entries SET
      date=@date, employee=@employee, department=@department,
      startTime=@startTime, endTime=@endTime, durationMin=@dur,
      location=@location, updatedAt=@now
    WHERE id=@id
  `).run({ ...b, dur, now, id });
  res.json({ ok: true });
});

app.delete("/api/entries/:id", (req, res) => {
  db.prepare(`DELETE FROM overtime_entries WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/export.csv", (_req, res) => {
  const headers = ["id","date","employee","department","startTime","endTime","durationMin","location","createdAt","updatedAt"];
  const rows = db.prepare(`SELECT ${headers.join(",")} FROM overtime_entries ORDER BY date, id`).all();
  const csv = [headers.join(",")].concat(
    rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ).join("\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition","attachment; filename=overtime.csv");
  res.send(csv);
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));

// Excel export (XLSX)
// Not: Basit bir çalışma sayfası oluşturur.
app.get('/api/export.xlsx', (_req, res) => {
  try {
    const headers = ["id","date","employee","department","startTime","endTime","durationMin","location","createdAt","updatedAt"];
    const rows = db.prepare(`SELECT ${headers.join(',')} FROM overtime_entries ORDER BY date, id`).all();
    const xlsx = require('xlsx');
    const data = [headers, ...rows.map(r => headers.map(h => r[h]))];
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, 'Overtime');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="overtime.xlsx"');
    res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Excel oluşturulamadı' });
  }
});
