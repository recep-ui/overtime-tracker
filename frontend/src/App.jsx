// frontend/src/App.jsx
import { useEffect, useMemo, useState } from "react";

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

  const totalMin = useMemo(()=> rows.reduce((a,r)=>a+(r.durationMin||0),0), [rows]);
  const employeeCount = useMemo(()=> new Set(rows.map(r=>r.employee)).size, [rows]);
  const hhmm = (m)=> `${Math.floor(m/60)}s ${m%60}d`;

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
    <div style={{maxWidth: "1100px", margin: "0 auto", padding: 16}}>
      <h1 style={{fontWeight:700, fontSize: 22, marginBottom: 12}}>Mesai Takip (Basit)</h1>

      {/* Filtreler */}
      <div style={{display:"flex", gap: 8, alignItems:"end", flexWrap:"wrap", marginBottom: 12}}>
        <div><label>Tarih (Başlangıç)<br/>
          <input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/>
        </label></div>
        <div><label>Tarih (Bitiş)<br/>
          <input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/>
        </label></div>
        <div><label>Bölüm<br/>
          <select value={filters.department} onChange={e=>setFilters(f=>({...f,department:e.target.value}))}>
            <option value="">(Hepsi)</option>
            {DEPARTMENTS.map(d=> <option key={d} value={d}>{d}</option>)}
          </select>
        </label></div>
        <div><label>Çalışan<br/>
          <input value={filters.employee} onChange={e=>setFilters(f=>({...f,employee:e.target.value}))}/>
        </label></div>
        <div><label>Ara<br/>
          <input value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/>
        </label></div>
        <button onClick={()=>setFilters({from:"",to:"",q:"",department:"",employee:""})}>Temizle</button>
        <a href="/api/export.csv"><button>Dışa aktar (CSV)</button></a>
        <a href="/api/export.xlsx" style={{textDecoration:'none'}}><button>Dışa aktar (Excel)</button></a>
      </div>

      {/* Tablo */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Tarih</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Çalışan</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Bölüm</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Başlangıç</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Bitiş</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Süre</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}>Lokasyon</th>
              <th style={{borderBottom:"1px solid #ddd", textAlign:"left", padding:8}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.date}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.employee}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.department}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.startTime}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.endTime}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.durationMin} dk</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8}}>{r.location || "-"}</td>
                <td style={{borderBottom:"1px solid #f0f0f0", padding:8, whiteSpace:"nowrap"}}>
                  <button onClick={()=>edit(r)} style={{marginRight:6}}>Düzenle</button>
                  <button onClick={()=>del(r.id)}>Sil</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="8" style={{padding:12, color:"#666"}}>Kayıt yok.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="8" style={{padding:8, fontSize:12, color:'#555'}}>Çalışan sayısı: {employeeCount}</td>
            </tr>
            <tr>
              <td colSpan="5" style={{textAlign:"right", padding:8, fontWeight:600}}>Toplam:</td>
              <td style={{padding:8, fontWeight:600}}>{hhmm(totalMin)}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Form */}
      <div style={{marginTop:16, display:"grid", gap:8, gridTemplateColumns:"repeat(2, minmax(0, 1fr))"}}>
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
        <div style={{gridColumn:"span 2 / span 2"}}>
          <button onClick={save} style={{marginRight:8}}>{editingId ? "Güncelle" : "Ekle"}</button>
          {editingId && <button onClick={() => { setEditingId(undefined); resetForm(); }}>İptal</button>}
        </div>
      </div>
    </div>
  );
}
