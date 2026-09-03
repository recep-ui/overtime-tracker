import { useEffect, useMemo, useState, useCallback } from "react";
import "./App.css";

const DEPARTMENTS = ["Dokuma", "Boyahane", "İplik", "Konfeksiyon", "Danışma", "Lojistik", "Bakım-Onarım"];

// Süre formatlama (Örn: 2 sa 30 dk)
function formatDuration(min) {
  if (!min || isNaN(min) || min <= 0) return "0 dk";
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  if (hours > 0 && minutes > 0) return `${hours} sa ${minutes} dk`;
  if (hours > 0) return `${hours} sa`;
  return `${minutes} dk`;
}

// Canlı dakika hesaplama (gece devri destekli)
function calcMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let s = (sh || 0) * 60 + (sm || 0);
  let e = (eh || 0) * 60 + (em || 0);
  if (e < s) e += 24 * 60;
  return Math.max(0, e - s);
}

// Bölüme göre CSS sınıfı
function getDeptClass(dept) {
  if (!dept) return "default";
  const normalized = dept.toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  return normalized;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", q: "", department: "", employee: "" });
  const [draft, setDraft] = useState({
    date: new Date().toISOString().split("T")[0],
    employee: "",
    department: "",
    startTime: "17:00",
    endTime: "20:00",
    location: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cleanParams = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v.trim() !== "")
      );
      const qs = new URLSearchParams(cleanParams);
      const res = await fetch(`/api/entries?${qs.toString()}`);
      if (!res.ok) throw new Error("Kayıtlar yüklenemedi");
      const data = await res.json();
      setRows(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // İstatistik hesaplamaları
  const stats = useMemo(() => {
    const totalMin = rows.reduce((acc, r) => acc + (r.durationMin || 0), 0);
    const uniqueEmployees = new Set(rows.map((r) => r.employee.trim().toLowerCase())).size;
    const uniqueDepts = new Set(rows.map((r) => r.department.trim())).size;
    return {
      totalMin,
      totalHoursStr: formatDuration(totalMin),
      employeeCount: uniqueEmployees,
      deptCount: uniqueDepts,
      recordCount: rows.length,
    };
  }, [rows]);

  // Canlı form süresi
  const draftDuration = useMemo(() => {
    return calcMinutes(draft.startTime, draft.endTime);
  }, [draft.startTime, draft.endTime]);

  const resetForm = () => {
    setDraft({
      date: new Date().toISOString().split("T")[0],
      employee: "",
      department: "",
      startTime: "17:00",
      endTime: "20:00",
      location: "",
    });
    setEditingId(null);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!draft.date || !draft.employee.trim() || !draft.department || !draft.startTime || !draft.endTime) {
      showToast("Lütfen tüm zorunlu alanları (*) doldurun.", "error");
      return;
    }

    try {
      const url = editingId ? `/api/entries/${editingId}` : "/api/entries";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "İşlem başarısız.");
      }

      showToast(editingId ? "Kayıt başarıyla güncellendi." : "Yeni mesai kaydı eklendi.", "success");
      resetForm();
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleEdit = (r) => {
    setDraft({
      date: r.date,
      employee: r.employee,
      department: r.department,
      startTime: r.startTime,
      endTime: r.endTime,
      location: r.location || "",
    });
    setEditingId(r.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/entries/${deleteConfirmId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Silinemedi.");
      showToast("Kayıt başarıyla silindi.", "success");
      setDeleteConfirmId(null);
      if (editingId === deleteConfirmId) resetForm();
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Aktif filtrelere göre dışa aktarma URL'leri
  const filterQueryString = useMemo(() => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim() !== ""));
    const qs = new URLSearchParams(clean).toString();
    return qs ? `?${qs}` : "";
  }, [filters]);

  return (
    <div className="layout">
      {/* Toast Bildirimleri */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === "success" ? (
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 className="modal-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              Kaydı Silmek İstiyor musunuz?
            </h3>
            <p className="modal-text">Bu fazla mesai kaydı kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Vazgeç</button>
              <button className="btn btn-danger" onClick={handleDelete}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Üst Başlık & Durum */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h1 className="app-title">Overtime Tracker</h1>
            <p className="app-subtitle">Kurumsal Fazla Mesai & Vardiya Takip Sistemi</p>
          </div>
        </div>
        <div className="network-badge" title="Erişilebilir Yerel Ağ Adresi">
          <span className="network-dot"></span>
          <span>Ağ: {window.location.hostname}:{window.location.port || "5173"}</span>
        </div>
      </header>

      {/* İstatistik Kartları */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Toplam Mesai Süresi</span>
            <span className="stat-value">{stats.totalHoursStr}</span>
            <span className="stat-sub">({stats.totalMin} dakika)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Benzersiz Çalışan</span>
            <span className="stat-value">{stats.employeeCount} Kişi</span>
            <span className="stat-sub">Kayıtlı aktif personel</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Toplam Kayıt</span>
            <span className="stat-value">{stats.recordCount} Adet</span>
            <span className="stat-sub">Listelenen mesai girdisi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Aktif Bölümler</span>
            <span className="stat-value">{stats.deptCount} Bölüm</span>
            <span className="stat-sub">Fazla mesai yapan departmanlar</span>
          </div>
        </div>
      </section>

      {/* Filtreler Paneli */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filtreleme & Arama Seçenekleri
          </h2>
          {loading && <span className="stat-sub">Güncelleniyor...</span>}
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Bölüm</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            >
              <option value="">(Tüm Bölümler)</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Çalışan Adı</label>
            <input
              type="text"
              placeholder="Örn: Ahmet"
              value={filters.employee}
              onChange={(e) => setFilters((f) => ({ ...f, employee: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Genel Arama</label>
            <input
              type="text"
              placeholder="Çalışan, durak, bölüm..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
        </div>

        <div className="filter-actions">
          <div className="filter-actions-left">
            <button
              className="btn btn-ghost"
              onClick={() => setFilters({ from: "", to: "", q: "", department: "", employee: "" })}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Filtreleri Temizle
            </button>
          </div>

          <div className="filter-actions-right">
            <a href={`/api/export.csv${filterQueryString}`} className="btn btn-success" download="fazla-mesai.csv">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              CSV İndir (Excel Uyumlu)
            </a>

            <a href={`/api/export.xlsx${filterQueryString}`} className="btn btn-success" download="fazla-mesai.xlsx">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Excel (XLSX) İndir
            </a>
          </div>
        </div>
      </section>

      {/* Mesai Kayıtları Tablosu */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Fazla Mesai Kayıt Listesi
          </h2>
          <span className="stat-sub">{rows.length} kayıt listeleniyor</span>
        </div>

        <div className="table-wrapper">
          <table className="overtime">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Çalışan Personel</th>
                <th>Bölüm</th>
                <th>Saat Aralığı</th>
                <th>Mesai Süresi</th>
                <th>Servis / Durak</th>
                <th style={{ textAlign: "right" }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isEditing = r.id === editingId;
                const initials = r.employee
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={r.id} className={isEditing ? "editing" : ""}>
                    <td>
                      <strong>{r.date}</strong>
                    </td>
                    <td>
                      <div className="emp-cell">
                        <span className="emp-avatar">{initials}</span>
                        <span>{r.employee}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-dept ${getDeptClass(r.department)}`}>{r.department}</span>
                    </td>
                    <td>
                      <div className="time-range">
                        <span>{r.startTime}</span>
                        <span className="arrow">→</span>
                        <span>{r.endTime}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-duration">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 15 14" />
                        </svg>
                        {formatDuration(r.durationMin)}
                      </span>
                    </td>
                    <td>{r.location || <span style={{ color: "var(--text-muted)" }}>-</span>}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => handleEdit(r)}
                        className="btn btn-primary btn-sm"
                        style={{ marginRight: 8 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Düzenle
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(r.id)}
                        className="btn btn-danger btn-sm"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="table-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>Kayıt bulunamadı. Filtre kriterlerinizi değiştirebilir veya aşağıdan yeni bir kayıt ekleyebilirsiniz.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Kayıt Ekleme / Güncelleme Formu */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {editingId ? `Kayıt Düzenle (ID: #${editingId})` : "Yeni Fazla Mesai Kaydı Ekle"}
          </h2>
          {editingId && (
            <button className="btn btn-ghost btn-sm" onClick={resetForm}>
              Düzenlemeyi İptal Et
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group">
              <label>
                Tarih <span className="req">*</span>
              </label>
              <input
                type="date"
                required
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>
                Çalışan Personel <span className="req">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ad Soyad"
                value={draft.employee}
                onChange={(e) => setDraft((d) => ({ ...d, employee: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>
                Bölüm <span className="req">*</span>
              </label>
              <select
                required
                value={draft.department}
                onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
              >
                <option value="">Bölüm Seçiniz...</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Başlangıç Saati <span className="req">*</span>
              </label>
              <input
                type="time"
                required
                value={draft.startTime}
                onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>
                Bitiş Saati <span className="req">*</span>
              </label>
              <input
                type="time"
                required
                value={draft.endTime}
                onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Servis / Durak / Lokasyon</label>
              <input
                type="text"
                placeholder="Örn: 2. Durak, Merkez, vs."
                value={draft.location}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="live-duration-preview">
              <span>Hesaplanan Mesai Süresi:</span>
              <strong>{formatDuration(draftDuration)} ({draftDuration} dk)</strong>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {editingId ? "Değişiklikleri Güncelle" : "Mesai Kaydını Kaydet"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Formu Temizle
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
