# PPM1 Backend — Setup Google Apps Script

Estimasi waktu: **10-15 menit**.

## Langkah 1: Buat Google Sheet
1. Buka https://sheets.google.com → **Spreadsheet kosong baru**.
2. Beri nama: **`PPM1 Inventaris & Booking`**.
3. (Opsional) Ubah nama tab sheet pertama jadi `items`.

## Langkah 2: Buka Apps Script
1. Di Google Sheet, klik menu **Extensions → Apps Script**.
2. Hapus semua kode yang ada di editor.
3. Paste **seluruh isi file `backend.gs`** di sini (1 file, ~500 baris).
4. Simpan (**Ctrl+S** / ikon 💾).

## Langkah 3: Jalankan Setup
1. Di atas editor, dropdown fungsi: pilih **`setup`**.
2. Klik **Run** ▶️.
3. Izinkan akses (Google akan minta izin) → pilih akun Google Anda → **Allow**.
4. Tunggu selesai (2-5 detik).

**Hasil:** Sheet otomatis dibuat:
- `items`, `bookings`, `users`, `activity_log`, `labels`
- User `admin` dengan password **`AdminPPM1@2026`** (GANTI SETELAH DEPLOY!)

## Langkah 4: Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Klik ikon ⚙️ (gear) di samping → pilih **Web app**.
3. Isi:
   - **Description:** PPM1 Backend v1
   - **Execute as:** Me
   - **Who has access:** **Anyone** (penting! agar web GitHub Pages bisa fetch)
4. Klik **Deploy**.
5. Salin **Web app URL** (format: `https://script.google.com/macros/s/XXXXX/exec`).

## Langkah 5: Ganti Password Admin
Langsung setelah deploy:
1. Buka web PPM1 → login `admin` / `AdminPPM1@2026`.
2. Di tab Log (atau tab khusus admin nanti), ganti password admin ke yang Anda mau.
3. (Opsional) Tambah user tim Anda: klik ⚙️ → **Tambah User** → isi username, password, role, nama.

## Langkah 6: Hubungkan Web
Di file `index.html` (folder `website/`), ada variabel `API_BASE`. Ganti dengan URL Web App Anda:

```js
const API_BASE = 'https://script.google.com/macros/s/XXXXX/exec';
```

Simpan & push. Web otomatis cek login dulu, lalu sinkron ke backend.

## Ganti Password Admin (Opsional)
Di sheet `users`:
1. Baris pertama data (baris 2) = user `admin`.
2. Anda bisa hapus & bikin ulang lewat UI web (klik ⚙️ → Tambah User → role admin).
3. Atau edit kolom `passHash` & `salt` secara langsung (rumit).

## Struktur Google Sheet

| Sheet | Isi |
|---|---|
| `items` | 1 baris = 1 item, 10 kolom |
| `bookings` | 1 baris = 1 booking, 11 kolom |
| `users` | 1 baris = 1 user, 6 kolom (username, hash, salt, role, nama, created_at) |
| `activity_log` | 1 baris = 1 log, 4 kolom (timestamp, type, detail, userId) |
| `labels` | 1 baris = 1 label, 3 kolom (jenis, label, created_at) |

## Keamanan
- **Password di-hash SHA-256 + salt** — tidak disimpan plaintext.
- **Role check di server** — user `viewer` tidak bisa tambah/edit item, `editor` tidak bisa kelola user, hanya `admin` bisa semua.
- **Session token** (UUID, 7 hari) — tidak perlu login ulang tiap buka.
- **Audit log** — semua aksi tercatat di `activity_log` dengan userId.

## Batas & Tips
- **Google Apps Script**: 6 menit/request, 50 request/menit per project, 500 MB egress/hari — lebih dari cukup untuk tim kecil.
- **Google Sheet**: 5 juta sel total, 100.000 baris per sheet — lebih dari cukup untuk inventaris.
- **Backup**: Sheet bisa di-download sebagai `.csv` (File → Download). Atau pakai add-on **Sheet Backup** untuk backup otomatis ke Drive.
- **CORS**: Fetch dari web GitHub Pages ke Apps Script harus lewat `no-cors` + `redirect: 'follow'`. Backend sudah di-set `Anyone` access.

## Kapan Pakai vs Kapan Tidak
**Pakai Apps Script** jika:
- Tim kecil (< 20 user)
- Data terpusat di Google Sheet (backup & sharing gampang)
- Budget Rp 0

**Pindah ke Supabase/Firebase** jika:
- Lebih dari 20 user aktif
- Butuh real-time sync (websocket)
- Butuh database relasional lebih kuat
