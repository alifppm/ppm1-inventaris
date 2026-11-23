# PPM1 — Inventaris Online (Gratis, Akses dari Mana Saja)

## Apa ini
Website inventaris untuk Putri Pinang Masak 1, dibuat 23 November 2026.
Semua data tersimpan **gratis** di browser Anda (localStorage) — tanpa biaya, tanpa server berbayar.

## File
- `index.html` — website utama (buka di browser, atau hosting gratis)
- `data-seed.json` — 71 item dari Google Sheet Anda, sebagai data awal
- `README.md` — panduan ini

## Cara pakai (paling cepat — tanpa hosting)

### Opsi A: Buka langsung dari PC (paling praktis untuk mulai)
1. Klik `index.html` → buka di browser (Chrome / Edge / Safari).
2. Website akan memuat `data-seed.json` otomatis (71 item dari Sheet).
3. **Data tersimpan di browser** — saat Anda menutup, semua perubahan tetap ada di browser ini.
4. Untuk tim yang lain di PC/HP berbeda, masing-masing perlu **download file `data-seed.json` dari tim Anda** lalu "Impor" di website mereka.

### Opsi B: Hosting gratis di GitHub Pages (rekomendasi untuk tim)
1. Buat akun GitHub gratis di https://github.com
2. Buat repo baru bernama `ppm1-inventaris` (public)
3. Upload 3 file ini ke repo (via `git` atau lewat halaman web GitHub)
4. Di repo: **Settings → Pages → Source: main branch → Save**
5. Setelah 1-2 menit, website live di `https://{username}.github.io/ppm1-inventaris/`
6. Bagikan link itu ke tim — semua orang bisa akses dari HP/PC/laptop di mana saja.
7. **Catatan penting**: hosting ini **read-only**. Tim **tidak bisa input langsung** ke website; input masih di Google Sheet. Setiap ada perubahan di Sheet, Anda update `data-seed.json` di repo → semua yang buka website lihat data baru.

## Cara input/edit
1. Klik tombol **"＋ Tambah Item"** → form muncul di bawah tabel.
2. Isi kolom → **"Simpan"**.
3. Untuk edit: klik **"✎ Edit"** di baris item → form terisi data lama → **"Simpan Perubahan"**.
4. Untuk hapus: klik **"✕ Hapus"** → konfirmasi.
5. Semua perubahan **tersimpan otomatis di browser** (localStorage) — aman selama tidak clear browsing data.

## Backup & sync antar device
- **"Export JSON"** → unduh file `.json` berisi seluruh inventaris → kirim ke tim / simpan di Drive
- **"Impor JSON"** → pilih file `.json` tadi → data di perangkat lain terisi
- **Google Sheet tetap jadi source of truth**: setiap kali Sheet diupdate, Anda export Sheet → ganti `data-seed.json` di repo → push → website live dengan data baru.

## Struktur data
```json
{
  "id": "9b88934a",
  "nama": "Gaun Pengantin Wanita (Merah)",
  "kategori": "UMUM",
  "foto": "Master Barang_Images/9b88934a.Foto Barang.025249.jpg",
  "kondisi": "BAIK",
  "qty": 1
}
```

## Batasan (honest, semua gratis)
- localStorage per browser — **tidak real-time sync antar perangkat**
- Foto dari folder `Master Barang_Images` di Google Drive tidak otomatis tampil (butuh URL publik per file) — placeholder kotak ditampilkan sampai foto ditambahkan
- Untuk sync real-time gratis antar perangkat, butuh upgrade ke Google Sheets API + Google Apps Script (tetap gratis, tapi lebih kompleks)

## Saran alur kerja tim
- **Pemilik / admin**: input baru di Google Sheet, update `data-seed.json` di repo
- **Staf**: buka website, cari item via pencarian/filter, cek qty & kondisi
- **Backup mingguan**: export JSON dari salah satu perangkat, simpan di Drive
