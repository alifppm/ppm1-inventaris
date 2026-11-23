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

## ✅ Fitur Baru Fase 1b (Log & Laporan)

**Tab 📋 Log & Laporan** — klik tab ini untuk melihat:

### 1. Log Aktivitas (Audit Trail)
Setiap aksi tercatat otomatis:
- `item-add`, `item-edit`, `item-del` — item dibuat/diubah/dihapus
- `booking-add`, `booking-done`, `booking-del` — booking dibuat/ditutup/dihapus
- `label-add`, `label-del` — label kategori/kondisi ditambah/dihapus
- `import`, `export` — data di-impor/ekspor

**Fitur log:**
- Filter per jenis (dropdown "Semua Jenis")
- Batas 500 entri terakhir (anti-bengkak)
- **🧹 Kosongkan Log** — hapus manual
- **⬇ Export Log** — simpan sebagai JSON (backup / kirim ke tim)

### 2. Laporan Mingguan
Buka tab Log → isi **Mulai** & **Selesai** (default: 7 hari terakhir) → **📊 Tampilkan**.

Konten laporan:
| Card | Isi |
|---|---|
| Booking Aktif | Jumlah booking status AKTIF |
| Perkiraan Omzet | Σ (harga item × qty booking) |
| Item Rusak / Hilang / Dalam Perbaikan | Count dari kolom kondisi |
| Aktivitas Rentang | Jumlah entri log pada rentang tanggal |
| 🔥 5 Booking Terbesar | Ranking item paling mahal (sub-total) |
| 📋 Aktivitas Rentang | Daftar 50 entri log terakhir di rentang |

## Simulasi Kejadian Tak Terduga (Update)

| Kejadian | Cara tangani |
|---|---|
| Pelanggan mau 2 item, stok 1 | Booking ditolak |
| 2 pelanggan mau item sama, tanggal sama | Cek Stok → status "Penuh" |
| Kebaya sobek saat fitting | Edit item → RUSAK + keterangan |
| Aksesori hilang | Edit item → HILANG + keterangan |
| HP mati di lapangan | Data di localStorage; Export → Impor ke perangkat lain |
| Pelanggan kembalikan, kondisi beda | Booking ✓ Pulang + update item |
| **Siapa yang mengubah item X kemarin?** | Tab Log → filter `item-edit` → cari waktu |
| **Berapa omzet minggu ini?** | Tab Log → laporan mingguan → card "Perkiraan Omzet" |
| **Booking mana yang paling besar?** | Laporan mingguan → "5 Booking Terbesar" |
| **Item mana yang sedang rusak/hilang?** | Laporan mingguan → card "Item Rusak / Hilang / Dalam Perbaikan" |

## Rekomendasi Langkah Berikutnya

**Pilih salah satu:**

1. **Uji coba 1 minggu dulu** — pakai, upload foto, buat 2-3 booking, cek laporan. Jika ada yang kurang/salah, kita revisi cepat.
2. **Langsung upgrade ke Fase 2 (Apps Script backend)** — semua tim satu sumber data real-time, tetap gratis. Data tetap bisa ditarik ke Google Sheet Anda.
3. **Tambah fitur spesifik lagi** — mis. integrasi WhatsApp (kirim reminder otomatis), atau dashboard omzet bulanan di Google Sheet.

Mau yang mana?
