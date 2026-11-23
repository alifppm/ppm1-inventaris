# PPM1 Inventaris & Booking — Panduan Fase 1

Website: **https://alifppm.github.io/ppm1-inventaris/**

## Yang Baru (Fase 1)
1. **Tab Booking** — catat siapa pinjam apa, kapan, sampai kapan.
2. **Tab Cek Stok** — cek item masih tersedia pada tanggal tertentu (cegah double-booking).
3. **Kolom Harga & Keterangan** di form item.
4. **Status HILANG** otomatis ada di daftar kondisi.
5. **Lightbox foto** — klik foto item untuk memperbesar.

## Alur Pakai (Real-World)

### a. Menerima pesanan
1. Buka tab **Inventaris** → cari item → klik **📅** di baris item.
2. Otomatis pindah ke tab Booking, item & tanggal terisi → isi **nama pelanggan**, **qty**, **tanggal kembali**, **catatan** → **＋ Booking**.
3. Sistem menolak booking jika qty melebihi stok item.

### b. Mencegah double-booking
1. Buka tab **Cek Stok**.
2. Ketik ID atau nama item + rentang tanggal → **Cek Ketersediaan**.
3. Tabel hasil: tiap tanggal `Dipinjam / Sisa / Status / Pelanggan`. Jika ada hari yang `Penuh`, jangan booking tanggal itu.

### c. Barang rusak
1. Edit item (✎) → ubah **Kondisi** jadi `RUSAK` (atau `PERBAIKAN` kalau lagi dijahit).
2. Isi **Keterangan** (mis. "sobek di kerah, perlu dijahit oleh Bu Sari").
3. Stat "Rusak" di atas otomatis naik.

### d. Barang hilang
1. Edit item → **Kondisi** ketik `HILANG` (label baru otomatis masuk daftar).
2. Isi **Keterangan** (mis. "hilang sejak 2026-11-15, terakhir dipakai oleh X").
3. Stat "Hilang" di atas otomatis naik — mudah dipantau untuk audit.

### e. Barang kembali
1. Tab **Booking** → klik **✓ Pulang** pada kartu booking terkait → status jadi `SELESAI`, item bisa di-booking lagi.

### f. Tambah harga / label baru
- **Harga sewa**: edit item → isi kolom **Harga Sewa**.
- **Kategori/kondisi baru**: klik **⚙️ Kelola Label** → ketik di input box → **＋** — langsung bisa dipakai form & filter.

## Cara Foto Menampilkan
1. Foto disimpan di folder `images/` pada repo GitHub (`alifppm/ppm1-inventaris`).
2. Edit item → isi field **Foto** dengan path relatif, mis. `images/00000001.jpg`.
3. Klik foto di tabel → lightbox memperbesar.

**Upload foto gratis:**
- Buka https://github.com/alifppm/ppm1-inventaris → folder `images` → **Add file** → **Upload files** → drag foto → commit.
- Atau lewat terminal:
  ```
  cd repo-lokal && cp foto.jpg images/ && git add images/foto.jpg && git commit -m "foto item" && git push
  ```
- Path di form item harus sama dengan nama file di repo.

## Backup & Sharing
- **Export** (tombol atas) → file JSON berisi **items + bookings + daftar label**. Bagikan ke tim lain / simpan sebagai backup.
- **Impor** → pilih file JSON (format lama array pun diterima).
- **Reset** → kembali ke `data-seed.json` di server.

## Simulasi Kejadian Tak Terduga yang Sudah Bisa Dicegah
| Kejadian | Cara tangani di web |
|---|---|
| Pelanggan booking item qty 1, stok 1 | Booking valid; jika mau 2 → sistem tolak |
| 2 pelanggan mau item sama tanggal sama | Tab Cek Stok → tanggal itu status "Penuh" |
| Kebaya sobek saat fitting | Edit → kondisi RUSAK + keterangan "sobek kerah" |
| Aksesori hilang setelah audit | Edit → kondisi HILANG + keterangan kapan & terakhir dipegang siapa |
| HP mati di lapangan | localStorage → data tetap ada di browser; setelah online, Export + Impor ke perangkat lain |
| Pelanggan minta lihat foto | Klik foto item → lightbox |
| Pelanggan kembalikan, kondisi beda | Booking → ✓ Pulang + edit item kondisi/keterangan sesuai |
| Stok 3, 2 terbook, mau booking 2 lagi | Cek Stok: hari itu sisa=1 → booking 2 ditolak |

## Batas Fase 1
- Data **per browser** (localStorage). Belum sync antar perangkat secara real-time.
- Foto harus di-commit ke GitHub (bisa dari web UI, gratis).
- Belum ada log "siapa mengubah apa" (riwayat audit).

**Fase 2** (bila sudah terbukti lancar) upgrade ke **Google Apps Script** sebagai backend: semua tim satu sumber data real-time, tetap gratis.
