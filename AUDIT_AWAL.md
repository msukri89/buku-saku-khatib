# Audit Awal — Buku Saku Khatib

Tanggal audit: 17 Oktober 2026  
Branch audit/pengembangan: `rebuild/foundation-v1`  
Branch produksi yang dipertahankan: `main`

## Ringkasan

Repositori saat audit berisi:
- `index.html`: UI satu halaman dan permintaan pembuatan naskah melalui Google Apps Script.
- `manifest.json`: metadata PWA, dengan ikon placeholder eksternal.
- `sw.js`: cache dasar untuk `./`, `index.html`, dan `manifest.json`.
- `README.md`: sebelumnya hanya berisi nama repositori.

## Temuan

### P0 — Service worker belum didaftarkan
Di `index.html` belum ditemukan pemanggilan `navigator.serviceWorker.register(...)`. Karena itu, keberadaan `sw.js` saja belum membuat halaman dikontrol service worker atau tersedia offline.

### P0 — Aset UI masih bergantung pada internet
Tailwind CSS dimuat dari CDN. Saat offline pada kunjungan pertama atau ketika aset CDN belum tersimpan, tampilan tidak dapat diandalkan. Untuk fondasi offline-first, CSS penting sebaiknya lokal di dalam repositori.

### P1 — Materi belum menjadi buku saku
UI saat ini hanya memiliki input tema dan hasil generator. Belum ada pustaka materi, pencarian, kategori, simpan naskah, atau halaman baca offline.

### P1 — Bentuk naskah belum dijamin
Frontend mengambil teks dari `data.candidates[0].content.parts[0].text`. Frontend belum memvalidasi bahwa respons memuat khutbah pertama, khutbah kedua, ayat/hadis, sumber, teks Arab berharakat, dan terjemahan.

### P1 — Output AI dimasukkan sebagai HTML
Respons AI diproses lalu dimasukkan melalui `innerHTML`, termasuk pesan error. Ini dapat menafsirkan teks keluaran sebagai markup. Tampilan hasil sebaiknya menggunakan teks aman atau renderer yang meng-escape HTML.

### P1 — Ketergantungan backend belum diaudit
Frontend memanggil deployment Google Apps Script yang sudah ada. Source code backend belum berada di repositori ini, jadi prompt, model, validasi dalil, penanganan error, dan konfigurasi rahasia belum bisa diverifikasi dari file repositori.

### P2 — Cache terlalu minimal
Service worker saat ini tidak membersihkan cache versi lama, tidak memiliki halaman fallback offline yang jelas, dan hanya menyimpan tiga URL. Strategi cache perlu diperbaiki setelah aset lokal dan halaman offline ditentukan.

### P2 — Metadata PWA
Ikon manifest memakai URL placeholder eksternal. Sebaiknya diganti dengan ikon lokal agar pemasangan PWA dan tampilan offline tidak bergantung pada layanan pihak ketiga.

## Rencana kerja aman

1. Pertahankan `main` sebagai versi saat ini; seluruh perubahan awal dikerjakan pada branch `rebuild/foundation-v1`.
2. Audit source Google Apps Script yang menjadi backend generator.
3. Sepakati kontrak respons backend yang terstruktur: `khutbah_pertama`, `khutbah_kedua`, `dalil`, `sumber`, dan status verifikasi.
4. Bangun UI buku saku, pencarian, dan simpan/baca naskah.
5. Terapkan cache offline untuk aset lokal dan materi yang sudah disimpan.
6. Uji online/offline, validasi struktur respons, dan keamanan rendering sebelum perubahan digabung ke `main`.

## Batasan penting

AI tidak boleh mengarang teks Arab, nomor ayat, kutipan hadis, atau status kesahihan. Sumber dan kutipan yang tidak dapat diverifikasi harus ditandai untuk pemeriksaan manusia, bukan ditampilkan sebagai fakta yang telah dipastikan.
