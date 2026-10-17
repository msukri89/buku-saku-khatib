# Rencana Integrasi AI Gratis + MCP Turath

Status: rencana teknis; belum memasukkan API key, token, atau kredensial apa pun.

## Batas keselamatan

- Perubahan Buku Saku Khatib dilakukan hanya pada branch `rebuild/foundation-v1`.
- Jangan mengubah atau menimpa branch `main` selama audit dan pengujian.
- Jangan menaruh Gemini API key di `index.html`, JavaScript frontend, `manifest.json`, service worker, URL, commit, issue, atau log.
- Jangan meminta pengguna mengirim API key ke chat. Konfigurasikan langsung pada penyimpanan rahasia backend.
- MCP Turath adalah sumber penelusuran teks. AI hanya membantu menyusun dan menjelaskan hasil retrieval, bukan menggantikan sumber.
- Jangan menghasilkan kutipan Arab, nomor ayat/hadis, nama kitab, jilid, halaman, atau status hadis yang tidak didukung hasil retrieval.
- Jika sumber belum ditemukan atau hubungan semantik belum terverifikasi, beri status "Perlu verifikasi"; jangan menyebutnya "Terverifikasi".
- Aplikasi adalah alat bantu penelusuran dan penyusunan draf khutbah, bukan pemberi fatwa.

## Arsitektur target

Browser/PWA -> backend tepercaya -> (1) MCP Turath untuk retrieval dan (2) Gemini API untuk penyusunan berdasarkan hasil retrieval -> validasi struktur dan atribusi -> hasil dengan referensi sumber.

Frontend tidak boleh memanggil Gemini API secara langsung. Backend memegang API key dan mengendalikan kuota, validasi input, batas panjang output, penanganan error, dan logging tanpa secret.

## Integrasi MCP yang sudah dikenal

Endpoint yang pernah digunakan: `https://mcp.turath.io/mcp`.

Adapter yang pernah dipakai: `search_turath`, `get_page`, dan `get_book`; fungsi integrasi sebelumnya meliputi `turathRequest()`, `v7TurathRequest()`, `callTurathTool()`, dan `v7CallTurathTool()`.

Sebelum mengintegrasikan ulang ke aplikasi ini, lakukan pemeriksaan read-only melalui `tools/list`, lalu uji pencarian dan pengambilan halaman dengan permintaan non-mutatif. Jangan mengasumsikan `get_author` atau `discover_turath` tersedia tanpa hasil pemeriksaan.

## Tahapan implementasi

1. Simpan API key baru pada backend, bukan pada repository atau browser.
2. Uji Gemini secara minimal dari backend dengan model yang benar-benar tersedia pada akun dan free tier.
3. Uji MCP secara read-only; catat tool yang tersedia dan bentuk hasilnya.
4. Tetapkan kontrak JSON internal untuk topik, kerangka khutbah pertama/kedua, kutipan sumber, metadata kitab/halaman, status verifikasi, dan catatan pemeriksaan.
5. Kirim hanya hasil Turath yang relevan ke model; instruksikan model untuk tidak menambah dalil atau metadata yang tidak ada dalam konteks.
6. Validasi hasil dan tampilkan sumber/metadata apa adanya; pisahkan kutipan sumber dari uraian AI.
7. Tambahkan rate limiting dan batas penggunaan untuk mencegah penyalahgunaan kuota.
8. Uji kasus sumber kosong, hasil ambigu, MCP gagal, kuota Gemini habis, respons tidak valid, dan koneksi terputus.
9. Jangan gabungkan perubahan ke `main` sebelum seluruh tes lolos dan ditinjau.

## Penyimpanan rahasia

Untuk Google Apps Script, gunakan Project Settings > Script Properties dan simpan key dengan nama properti `GEMINI_API_KEY`. Masukkan nilainya langsung di editor Apps Script milik pemilik project; jangan menaruh nilai tersebut pada kode sumber atau membagikannya melalui chat. Batasi akses editor Apps Script hanya kepada orang tepercaya karena editor dapat mengakses konfigurasi project.

Jika backend ternyata bukan Google Apps Script, gunakan secret/environment-variable manager milik platform tersebut. Jangan membuat file `.env` berisi key ke dalam repository; bila dipakai lokal, pastikan `.env` masuk `.gitignore`.

## Catatan privasi

Dokumentasi harga Gemini menyatakan bahwa pada free tier, konten yang dikirim dapat digunakan untuk meningkatkan produk Google. Hindari mengirim data pribadi atau rahasia. Tinjau ketentuan terbaru sebelum digunakan secara publik.

## Referensi resmi

- Membuat dan mengelola Gemini API key: https://ai.google.dev/gemini-api/docs/api-key
- Harga dan ketentuan free tier Gemini API: https://ai.google.dev/gemini-api/docs/pricing
