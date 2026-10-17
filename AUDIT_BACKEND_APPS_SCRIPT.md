# Audit Backend Google Apps Script — Buku Saku Khatib

Tanggal pemeriksaan: 2026-10-17

## Hasil pemeriksaan yang dapat dipastikan

1. Frontend di `index.html` pada branch `main` memanggil Web App Apps Script melalui URL yang ditanam di JavaScript dan mengirim tema dengan metode GET (`?tema=...`).
2. Frontend mengharapkan struktur respons yang menyerupai `data.candidates[0].content.parts[0].text`.
3. Sumber Apps Script (`Code.gs` dan file terkait) tidak ada di repository yang diperiksa. URL Web App tidak dapat dibaca sebagai sumber oleh alat pemeriksaan ini. Karena itu, kode backend, metode penyimpanan API key saat ini, prompt, izin deployment, dan akses MCP belum dapat dinyatakan aman atau telah diverifikasi.
4. Jangan menempelkan key/API token ke chat atau commit. Jangan mengubah deployment aktif sebelum source code diaudit dan versi baru diuji.

## Langkah aman: konfigurasi Script Properties

Lakukan pada project Apps Script yang benar-benar terkait dengan URL Web App lama.

1. Buka project dari Apps Script Dashboard: https://script.google.com/home
2. Pastikan project yang dibuka adalah project yang digunakan oleh deployment Buku Saku Khatib. Cocokkan melalui menu Deploy > Manage deployments dan URL Web App. Jangan mengubah deployment dulu.
3. Buka Project Settings.
4. Di bagian Script Properties, tambahkan properti:
   - Property: `GEMINI_API_KEY`
   - Value: tempel API key secara langsung di editor Script Properties.
5. Simpan. Jangan menaruh nilai key di `Code.gs`, HTML, GitHub, URL, log, issue, atau chat.
6. Batasi akses editor project kepada akun tepercaya. Script Properties bukan pengganti kontrol akses editor: editor yang berhak atas project dapat berpotensi membaca atau menggunakan rahasia project.

**Jangan menulis atau menjalankan kode pemanggil AI sebelum backend diaudit.** Pastikan dahulu bagaimana key lama dipakai, apakah ada fallback key yang tertanam, serta bagaimana request dan error dicatat.

## Cara membagikan source untuk audit

Dari editor Apps Script, buka setiap file source (misalnya `Code.gs` dan file `.gs` lain yang berkaitan dengan request AI/MCP), salin isi source ke file teks/Markdown, lalu unggah file tersebut di percakapan ini untuk diperiksa.

Sebelum mengunggah, hapus atau ganti semua nilai rahasia dengan placeholder seperti `[REDACTED]`, termasuk:
- API key AI lama/baru
- access token, refresh token, OAuth client secret
- password, cookie, bearer token
- URL webhook rahasia atau kredensial lain

Nama properti seperti `GEMINI_API_KEY` boleh tetap terlihat; nilainya jangan disertakan. URL Web App yang sudah publik bukanlah API key, tetapi jangan sertakan URL deployment baru yang tidak ingin dipublikasikan.

## Temuan risiko frontend yang perlu diperbaiki

- Topik dikirim melalui GET sehingga dapat muncul dalam riwayat URL/log. Setelah audit backend, pertimbangkan POST dengan validasi input dan batas panjang.
- Output AI dimasukkan melalui `innerHTML`. Untuk teks sumber dan output AI, utamakan `textContent` dan rendering yang di-escape; jangan menganggap output AI sebagai HTML tepercaya.
- Frontend saat ini bergantung pada bentuk respons Gemini secara langsung. Backend sebaiknya mengembalikan kontrak JSON aplikasi yang stabil dan tervalidasi, bukan mengekspos respons mentah provider.
- Jangan mengirim hasil ke pengguna sebagai "terverifikasi" kecuali referensi yang benar-benar dikembalikan MCP dapat ditelusuri dan diperiksa.

## Tahap berikutnya setelah source tersedia

1. Cari semua pemakaian API key dan pastikan tidak ada secret hard-coded.
2. Audit `doGet`, `doPost`, izin deployment, validasi input, penanganan error, dan log.
3. Audit koneksi MCP Turath secara read-only, daftar tool yang benar-benar tersedia, dan struktur metadata sumber.
4. Tentukan migrasi minimal ke Script Properties dan endpoint backend baru tanpa mengganggu deployment aktif.
5. Uji versi baru secara terpisah; pertahankan deployment aktif dan branch `main` sampai pengujian lulus.
