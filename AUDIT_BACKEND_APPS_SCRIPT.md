# Audit Backend Google Apps Script — Buku Saku Khatib

Tanggal pemeriksaan: 2026-10-17

## Hasil pemeriksaan source yang dibagikan

Source yang dibagikan menggunakan sintaks Google Apps Script dan fungsi bawaan GAS, antara lain `doGet()`, `HtmlService`, `UrlFetchApp.fetch()`, serta `JSON.stringify()`.

### Arsitektur yang terlihat

- `doGet()` menyajikan file HTML bernama `Index` dari project Apps Script.
- `prosesKhutbah(tema, kategori)` memanggil `panggilAI()`.
- `panggilAI()` mengirim permintaan chat-completions ke Together AI.
- Model yang ditentukan di source adalah `meta-llama/Llama-3.3-70B-Instruct-Turbo`.
- Kode ini belum memanggil MCP Turath dan belum mengambil sumber dalil secara terprogram.
- Respons hanya mengembalikan teks dari `choices[0].message.content`; tidak ada struktur referensi sumber atau status verifikasi.

### Temuan keamanan kritis

**API token Together AI sempat ditempel sebagai teks langsung dalam percakapan. Perlakukan token itu sebagai telah terekspos.** Cabut/revoke token tersebut dari dashboard penyedia secepatnya, lalu buat token baru hanya jika masih diperlukan. Jangan gunakan ulang token yang terekspos. Nilai token tidak disalin ke dokumen ini atau repository.

API key saat ini ditanam langsung di source melalui konstanta `API_KEY`. Pola ini harus dihilangkan. Setelah beralih ke Gemini, simpan key baru di Script Properties dengan nama `GEMINI_API_KEY`; kode membacanya melalui `PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY')`. Jangan pernah mengirim nilai key ke browser, URL, log, commit, issue, atau chat.

### Ketidakcocokan dengan frontend GitHub yang diperiksa

Frontend di repository lama mengirim GET ke URL Web App dengan parameter `?tema=...` dan mengharapkan JSON dalam bentuk `candidates[0].content.parts[0].text`.

Sebaliknya, `doGet()` dalam source yang dibagikan hanya menyajikan file HTML `Index`; fungsi itu tidak membaca parameter `tema` atau mengembalikan JSON. `panggilAI()` mengembalikan teks biasa. Ini mengindikasikan source yang dibagikan kemungkinan merupakan project/versi berbeda dari endpoint yang dipanggil frontend GitHub, atau frontend/backend perlu diselaraskan. Jangan mengubah deployment aktif sebelum kita memastikan project dan URL yang benar.

### Temuan kualitas dan validasi

- Prompt meminta dalil lengkap dan valid, tetapi tidak ada retrieval atau pemeriksaan otomatis untuk memastikan teks Arab, terjemahan, nomor ayat/hadis, nama kitab, jilid, atau halaman benar.
- Instruksi "valid 100%" tidak menjamin hasil model benar. Dalil dan atribusi perlu didukung hasil MCP yang benar-benar dikembalikan, dengan status verifikasi yang jujur.
- `kategori` dipakai untuk memilih instruksi khusus, tetapi perlu validasi nilai kategori yang diterima.
- Input tema tidak divalidasi panjang atau kontennya.
- Error API diteruskan dengan isi respons mentah. Jangan sampai detail internal atau informasi sensitif bocor kepada pengguna.
- Setelah migrasi, gunakan batas input/output, penanganan status HTTP, validasi JSON, rate limiting bila sesuai, dan logging tanpa secret.

## Langkah aman: simpan Gemini API key

Lakukan pada project Apps Script yang benar-benar terkait dengan deployment yang akan digunakan.

1. Buka https://script.google.com/home.
2. Pilih project yang benar dan cocokkan melalui Deploy > Manage deployments. Jangan deploy versi baru dahulu.
3. Buka Project Settings > Script Properties.
4. Tambahkan:
   - Property: `GEMINI_API_KEY`
   - Value: tempel key Gemini langsung di Script Properties.
5. Simpan dan batasi akses editor kepada orang tepercaya.

Script Properties bukan pengganti kontrol akses editor: editor project yang berhak dapat berpotensi membaca atau menggunakan rahasia project.

## Pemeriksaan berikutnya

1. Konfirmasi apakah source ini berasal dari project yang sama dengan URL Web App yang tertanam pada frontend GitHub.
2. Periksa daftar file project, terutama apakah ada file `Index.html` dan fungsi pemanggil dari frontend.
3. Uji koneksi Gemini di project pengujian terpisah setelah key disimpan dengan aman.
4. Periksa MCP Turath secara read-only dan catat tool yang benar-benar tersedia sebelum membuat adapter.
5. Tetapkan format respons aplikasi yang stabil: naskah, kutipan sumber, metadata kitab/halaman jika tersedia, dan status verifikasi.
6. Pertahankan deployment aktif serta branch `main` sampai semua tes lolos.

## Batasan

Kode yang dibagikan di chat adalah bukti untuk analisis, tetapi bukan bukti bahwa itu source dari deployment GitHub yang saat ini aktif. Pemeriksaan hubungan deployment perlu dilakukan dari editor Apps Script oleh pemilik project.
