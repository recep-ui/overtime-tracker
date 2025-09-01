// frontend/src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

// Bölüm seçenekleri
const DEPARTMENTS = ["Boyahane","İplik","Konfeksiyon","Dokuma","Danışma"];

export default function App() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ from:"", to:"", q:"", department:"", employee:"" });
  const [draft, setDraft] = useState({ date:"", employee:"", department:"", startTime:"", endTime:"", location:"" });
  const [editingId, setEditingId] = useState();

  const load = async () => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([,v])=>v));
    const res = await fetch(`/api/entries?${qs.toString()}`);
    setRows(await res.json());
  };
  useEffect(()=>{ load(); }, [JSON.stringify(filters)]);

  const employeeCount = useMemo(()=> new Set(rows.map(r=>r.employee)).size, [rows]);

  const resetForm = () => setDraft({ date:"", employee:"", department:"", startTime:"", endTime:"", location:"" });

  const save = async () => {
    const body = JSON.stringify(draft);
    if (editingId) {
      await fetch(`/api/entries/${editingId}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body });
    } else {
      await fetch(`/api/entries`, { method:"POST", headers:{ "Content-Type":"application/json" }, body });
    }
    resetForm(); setEditingId(undefined); load();
  };

  const edit = (r) => { setDraft(r); setEditingId(r.id); };
  const del = async (id) => { await fetch(`/api/entries/${id}`, { method:"DELETE" }); load(); };

  return (
    <div className="layout">
      <h1 className="app-title">Mesai Takip <span className="muted" style={{fontWeight:400}}>(Basit)</span></h1>

      {/* Filtreler */}
      <div className="panel filters">
        <div><label>Tarih (Başlangıç)
          <input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/>
        </label></div>
        <div><label>Tarih (Bitiş)
          <input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/>
        </label></div>
        <div><label>Bölüm
          <select value={filters.department} onChange={e=>setFilters(f=>({...f,department:e.target.value}))}>
            <option value="">(Hepsi)</option>
            {DEPARTMENTS.map(d=> <option key={d} value={d}>{d}</option>)}
          </select>
        </label></div>
        <div><label>Çalışan
          <input value={filters.employee} onChange={e=>setFilters(f=>({...f,employee:e.target.value}))}/>
        </label></div>
        <div><label>Ara
          <input value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
        </label></div>
        <button onClick={()=>setFilters({from:"",to:"",q:"",department:"",employee:""})}>Temizle</button>
        <a href="/api/export.csv"><button>CSV</button></a>
        <a href="/api/export.xlsx" style={{textDecoration:'none'}}><button>Excel</button></a>
      </div>

      {/* Tablo */}
      <div className="panel" style={{marginTop:18, overflowX:"auto"}}>
        <table className="overtime">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Çalışan</th>
              <th>Bölüm</th>
              <th>Başlangıç</th>
              <th>Bitiş</th>
              <th>Lokasyon</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const editing = r.id === editingId;
              return (
              <tr key={r.id} className={editing?"editing":""}>
                <td>{r.date}</td>
                <td>{r.employee}</td>
                <td>{r.department}</td>
                <td>{r.startTime}</td>
                <td>{r.endTime}</td>
                <td>{r.location || "-"}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button onClick={()=>edit(r)} style={{marginRight:6}} className="primary">Düzenle</button>
                  <button onClick={()=>del(r.id)} className="danger">Sil</button>
                </td>
              </tr>);
            })}
            {rows.length === 0 && (
              <tr><td colSpan="7" style={{padding:12}} className="muted">Kayıt yok.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="stats-row">
              <td colSpan="7">Çalışan sayısı: {employeeCount}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Form */}
      <div className="panel" style={{marginTop:18}}>
        <div className="form-grid">
          <label>Tarih
            <input type="date" value={draft.date} onChange={e=>setDraft(d=>({...d,date:e.target.value}))}/>
          </label>
          <label>Çalışan
            <input value={draft.employee} onChange={e=>setDraft(d=>({...d,employee:e.target.value}))}/>
          </label>
          <label>Bölüm
            <select value={draft.department} onChange={e=>setDraft(d=>({...d,department:e.target.value}))}>
              <option value="">Seçin...</option>
              {DEPARTMENTS.map(d=> <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
            <label>Başlangıç
              <input type="time" value={draft.startTime} onChange={e=>setDraft(d=>({...d,startTime:e.target.value}))}/>
            </label>
            <label>Bitiş
              <input type="time" value={draft.endTime} onChange={e=>setDraft(d=>({...d,endTime:e.target.value}))}/>
            </label>
            <label>Lokasyon
              <input value={draft.location} onChange={e=>setDraft(d=>({...d,location:e.target.value}))}/>
            </label>
            <div style={{display:"flex", gap:10, alignItems:"center"}}>
              <button onClick={save} className="primary">{editingId ? "Güncelle" : "Ekle"}</button>
              {editingId && <button onClick={() => { setEditingId(undefined); resetForm(); }}>İptal</button>}
            </div>
        </div>
      </div>
    </div>
  );
}
