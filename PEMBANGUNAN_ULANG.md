# Pembangunan Ulang Buku Saku Khatib — Jalur Baru

## Keputusan

Bangun ulang backend dan frontend secara bersih karena source GAS yang dibagikan tidak cocok dengan Web App yang dipanggil oleh frontend GitHub. Pertahankan repository lama dan lakukan semua perubahan di branch `rebuild/foundation-v1`; jangan mengubah `main` atau deployment GAS lama.

## Produk yang dituju

Satu PWA mobile-first yang menggabungkan:
- Buku saku/materi khutbah yang bisa disimpan dan dibaca offline.
- Generator naskah khutbah pertama dan kedua.
- Kategori Jumat, Idulfitri, Iduladha, dan nikah.
- Penelusuran dalil dengan referensi yang berasal dari hasil MCP Turath.
- Pemisahan yang jelas antara kutipan sumber dan uraian yang dibantu AI.
- Status sumber: ditemukan, metadata tersedia/tidak tersedia, perlu verifikasi. Jangan mengklaim terverifikasi jika hasil retrieval tidak membuktikannya.
- Aplikasi sebagai alat bantu penelusuran dan penyusunan draf, bukan pemberi fatwa.

## Arsitektur tahap awal

PWA di GitHub Pages -> Web App Google Apps Script baru -> Gemini API melalui REST -> hasil JSON aplikasi.

MCP Turath akan ditambahkan melalui adapter backend setelah uji read-only memastikan endpoint, transport, daftar tools, skema argumen, dan bentuk respons. Jangan mengasumsikan nama tool atau dukungan transport sampai hasil uji didapat.

## Pengelolaan rahasia

- Buat project Apps Script baru, terpisah dari project lama.
- Simpan Gemini key di Script Properties dengan nama `GEMINI_API_KEY`.
- Jangan simpan key di frontend, repository, URL, log, issue, atau chat.
- Token Together AI yang pernah ditempel di percakapan harus dianggap terekspos dan dicabut dari dashboard penyedia.
- Batasi editor Apps Script hanya kepada orang tepercaya.

## Tahapan dan gerbang pengujian

### Tahap 0 — Isolasi
- Project GAS baru, deployment lama tidak diubah.
- Semua kode baru di branch `rebuild/foundation-v1`.

### Tahap 1 — Tes backend Gemini
- Endpoint POST menerima JSON, memvalidasi topik/kategori, membatasi ukuran input.
- Membaca key dari Script Properties.
- Memanggil model yang tersedia pada free tier akun.
- Mengembalikan JSON aplikasi yang stabil, bukan respons mentah provider.
- Error tidak menampilkan token, request header, atau detail sensitif.

### Tahap 2 — Tes MCP Turath read-only
- Kirim permintaan pemeriksaan protokol yang sesuai ke endpoint yang diketahui.
- Ambil daftar tools aktual; jangan menganggap tool tertentu tersedia.
- Uji pencarian dan ambil halaman hanya jika tools tersebut ditemukan.
- Catat judul kitab, halaman, teks, dan metadata hanya jika server benar-benar mengembalikannya.
- Bila transport atau akses tidak kompatibel dengan GAS, evaluasi adapter backend terpisah; jangan memalsukan hasil.

### Tahap 3 — Integrasi retrieval-grounded
- Cari sumber terlebih dahulu, baru kirim potongan sumber yang relevan ke Gemini.
- Model dilarang menciptakan kutipan Arab, nomor ayat/hadis, kitab, jilid, halaman, atau derajat hadis yang tidak tersedia dalam hasil retrieval.
- Referensi sumber ditampilkan terpisah dari penjelasan AI.
- Jika retrieval gagal atau hasil tidak cukup, tampilkan "Sumber belum ditemukan/perlu verifikasi", bukan dalil rekaan.

### Tahap 4 — PWA
- Mobile-first, navigasi buku saku dan generator.
- Penyimpanan materi yang dipilih untuk dibaca offline.
- Sanitasi output; gunakan rendering teks aman, bukan HTML dari model.
- Service worker didaftarkan dan diuji.
- PWA dapat membaca materi tersimpan offline; pembuatan khutbah baru memerlukan koneksi.

### Tahap 5 — Uji sebelum rilis
- Key tidak muncul di source, bundle, URL, dan log.
- Uji topik kosong/panjang, kategori tidak dikenal, kuota habis, MCP tidak tersedia, sumber kosong, respons malformed, dan offline.
- Jangan gabungkan ke `main` sampai pengujian lulus dan ditinjau.

## Batasan biaya dan privasi

Free tier dapat memiliki batas penggunaan dan kebijakan data yang berbeda menurut model/akun. Hindari mengirim informasi pribadi atau rahasia ke model. Jangan mengiklankan aplikasi sebagai "gratis tanpa batas".
