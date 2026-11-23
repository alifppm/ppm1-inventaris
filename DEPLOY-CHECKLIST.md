# PPM1 Inventory — Status Audit & Deploy

**Last audit:** 2026-11-23  
**Frontend:** ✅ LIVE (`https://alifppm.github.io/ppm1-inventaris/`)  
**Backend:** ⚠️ masih versi lama — perlu update manual (lihat di bawah)

---

## Checklist Deployment Backend (1 langkah, 5 menit)

### Cara Update Backend ke Versi Terbaru

1. Buka [Apps Script editor](https://script.google.com/macros/s/AKfycbzY6dKbnSn0lbIEAfal2078XzbcbQcShlGWE4Jt7IkxkWP8RaCxyBH7xykVFeRHzpMVLA/exec)
   → atau klik tombol **"Buka Apps Script"** dari Google Sheet yang dipakai backend
2. Pilih semua file `.gs`, **hapus isi** (Ctrl+A → Delete)
3. **Paste** isi penuh dari file ini: `website/backend/backend.gs` (dari GitHub repo `alifppm/ppm1-inventaris`)
4. Simpan (`Ctrl+S`)
5. Dari menu bar: **Deploy → Manage deployments → Edit deployment (pensil) → New version → Deploy**
6. Selesai. URL tetap sama.

### Reset Password Admin (opsional)
Jika login admin gagal setelah update:
1. Di editor, pilih `backend.gs`
2. Menu: **Run → resetAdminPassword**
3. Atau buka [URL ini](https://script.google.com/macros/s/AKfycbzY6dKbnSn0lbIEAfal2078XzbcbQcShlGWE4Jt7IkxkWP8RaCxyBH7xykVFeRHzpMVLA/exec?action=ping) untuk cek backend aktif

### Default Login
| Username | Password |
|----------|----------|
| `admin` | `AdminPPM1@2026` |

---

## Ringkasan Bug Ditemukan & Diperbaiki (Nov 2026)

### Frontend (`index.html`) — 8 bug diperbaiki
| # | Masalah | Fix |
|---|---------|-----|
| 1 | `addLabel` kirim `{type}` tapi backend baca `body.jenis` | Kirim `{jenis:type}` |
| 2 | `api('booking-add')` tidak ada di backend | Ganti `booking-save` |
| 3 | `api('booking-done')` tidak ada di backend | Ganti `booking-close` |
| 4 | `init()` overwrite localStorage dengan seed tiap page load | Seed hanya jika LS kosong |
| 5 | `delUser` cek `state.nama` (display name) bukan username | Cek `state.username` + blokir hapus `admin` |
| 6 | Label duplikat di server (UMUM×3, dll) | Backend idempotent |
| 7 | `cekStok` off-by-one WIB/UTC | Parse `T00:00:00` local |
| 8 | Race render sebelum sync selesai; sort string | `.then(render)` + cast number |

### Backend (`backend.gs`) — 4 bug tambahan ditemukan saat verifikasi
| # | Masalah | Fix |
|---|---------|-----|
| A | `addLabel` error pada sheet kosong (crash "Jumlah baris harus ≥1") | Guard `getLastRow() >= 2` |
| B | `logout` bisa crash pada sheet sessions kosong | Guard + String cast |
| C | `addUser` tidak cek duplikat username | Tambah cek sebelum insert |
| D | `removeUser` tidak blokir hapus akun `admin` | Block `admin` secara eksplisit |

### Langkah berikutnya
Setelah deploy backend baru, lakukan pengecekan cepat:
1. Login admin → buat kategori label baru
2. Coba tambah user baru
3. Coba tutup booking dan cek muncul di log
