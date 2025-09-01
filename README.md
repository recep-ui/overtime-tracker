# Overtime Tracker

Basit fazla mesai takip uygulaması. Backend: Express + better-sqlite3. Frontend: React (Vite).

## Klasörler
- `backend/` REST API ve SQLite veritabanı (`data.db`).
- `frontend/` React arayüzü.

## Çalıştırma
PowerShell:
```powershell
cd backend
npm install
node server.js
```
 Ayrı bir terminal:
```powershell
cd frontend
npm install
npm run dev
```
Tarayıcı: http://localhost:5173 (API 5174).

## Özellikler
- Kayıt listeleme, filtreleme
- Ekle / güncelle / sil
- Toplam süre ve benzersiz çalışan sayısı
- CSV ve Excel dışa aktarma

## Veritabanı
SQLite dosyası `backend/data.db` (git'e dahil edilmez). Silerseniz tablo otomatik yeniden oluşturulur.

## Dağıtım (örnek)
- Backend için basit: `node backend/server.js`
- Frontend: `npm run build` sonrası `frontend/dist` içeriğini statik sunucuya koyabilirsiniz.

## GitHub'a Yükleme
Aşağıdaki adımlar README sonunda tekrar açıklanmıştır.
