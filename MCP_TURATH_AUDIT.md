# MCP Turath — Hasil Pemeriksaan Awal

Tanggal: 2026-10-17
Branch kerja: `rebuild/foundation-v1`

## Hasil yang dilaporkan dari project GAS V2

### Initialize
- HTTP: 200
- Content-Type: application/json
- Protocol version: 2025-03-26
- Server: turath
- Server version: 1.28.0
- Capabilities: tools, resources, prompts

### tools/list
Permintaan `tools/list` berhasil dengan HTTP 200 dan mengembalikan 5 tools:

1. `discover_turath`
   - Metadata-only untuk books, authors, cats, atau all.
   - Parameter: `q` opsional, `kind`, `limit`.
2. `search_turath`
   - Pencarian korpus publik; teks per hasil dibatasi.
   - Parameter wajib `q` (pencarian Arab, maksimum 300 karakter), `page` opsional 1–10, filter opsional `book_id`, `author_id`, `cat_id`.
3. `get_book`
   - Parameter wajib `book_id`, `include_indexes` opsional.
4. `get_page`
   - Parameter wajib `book_id` dan `page_id`; gunakan `meta.page_id` dari hasil `search_turath`.
5. `get_author`
   - Parameter wajib `author_id`.

## Kesimpulan

Koneksi HTTP dan penemuan tools berhasil. Ini belum membuktikan bahwa pencarian teks dan pengambilan halaman sudah berhasil. Langkah berikutnya adalah memanggil `tools/call` untuk `search_turath` menggunakan query Arab yang aman dan membaca hasil beserta metadata.

## Prinsip integrasi

- Pertahankan `book_id`, `page_id`, judul kitab, penulis, dan metadata sebagaimana dikembalikan server.
- Jangan mengarang metadata atau menyatakan kutipan "terverifikasi" hanya karena model menghasilkannya.
- Bila pencarian tidak menghasilkan sumber relevan, tampilkan "Sumber belum ditemukan/perlu verifikasi".
- Lakukan pencarian Turath sebelum meminta Gemini menyusun uraian; kirim ke model hanya hasil relevan dengan batas panjang.
- Jangan mengubah branch `main` atau deployment lama selama pengembangan.
