# Overtime Tracker (Fazla Mesai Takip Sistemi)

Modern, hızlı ve responsive kurumsal fazla mesai takip uygulaması.
- **Backend**: Express.js + SQLite (`better-sqlite3`) + XLSX + CORS
- **Frontend**: React 19 + Vite + CSS Glassmorphism Dashboard

---

## Özellikler

- **Mesai Kayıt Yönetimi**: Ekleme, düzenleme, silme (onay pencereli)
- **Akıllı Süre Hesaplama**: Başlangıç ve bitiş saatine göre otomatik ve canlı süre hesaplama (gece vardiyası devri destekli)
- **Gerçek Zamanlı İstatistik Paneli**:
  - Toplam Fazla Mesai Süresi (saat ve dakika)
  - Benzersiz Çalışan Sayısı
  - Toplam Listelenen Kayıt Sayısı
  - Aktif Departman/Bölüm Sayısı
- **Gelişmiş Filtreleme**: Tarih aralığı, bölüm seçimi, çalışan adı ve genel metin araması
- **Gelişmiş Dışa Aktarma**:
  - **CSV**: Filtre parametreleri destekli ve Microsoft Excel'de Türkçe karakterlerin (ç, ğ, ı, ö, ş, ü) bozulmaması için **UTF-8 BOM** entegre edilmiş dışa aktarım
  - **Excel (XLSX)**: Biçimlendirilmiş süre sütunları ve dinamik sütun genişlikleriyle profesyonel Excel raporu
- **Modern Arayüz**: Glassmorphism efektleri, şık bölüm etiketleri, responsive yerleşim ve bildirim toastları

---

## Hızlı Başlangıç

### Tek Komutla Çalıştırma (Kök Dizin)

Projenin ana dizininde:

```bash
# Bağımlılıkları yüklemek için:
npm run install:all

# Backend (5174) ve Frontend'i (5173) yerel ağ erişimli başlatmak için:
npm run dev
```

Erişim Adresleri:
- **Yerel Cihazınızdan:** [http://localhost:5173](http://localhost:5173)
- **Aynı Ağdaki Diğer Cihazlardan:** `http://<BILGISAYAR_IP_ADRESI>:5173` (Örn: `http://10.0.80.113:5173`)

---

### Ayrı Terminallerde Çalıştırma (İsteğe Bağlı)

**1. Terminal (Backend - API):**
```bash
cd backend
npm install
npm start
```
API Portu: `http://localhost:5174`

**2. Terminal (Frontend - Arayüz):**
```bash
cd frontend
npm install
npm run dev
```
Uygulama Portu: `http://localhost:5173`

---

## Veritabanı ve Şema

- SQLite veritabanı `backend/data.db` konumunda saklanır.
- Tablo şeması eksik sütunları (örn: `durationMin`) otomatik migrate eder ve geçmiş kayıtların sürelerini otomatik tamamlar.
