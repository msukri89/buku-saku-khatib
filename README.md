# Buku Saku Khatib

PWA untuk membantu khatib membaca materi khutbah dan menyusun naskah khutbah Jumat dengan dalil, penjelasan ulama, referensi, dan estimasi durasi.

## Branch pengembangan

- Repository lama dipertahankan.
- Pengembangan dilakukan pada `rebuild/foundation-v1`.
- Branch `main` tidak diubah.
- Jangan menggabungkan ke `main` sebelum backend dan alur utama diuji.

## Standar generator khutbah

Dokumen kanonis prompt: [`PROMPT_GENERATOR_KHUTBAH.md`](PROMPT_GENERATOR_KHUTBAH.md).

Standar utama:
- Target total khutbah sekitar 10 menit, tanpa mengorbankan rukun khutbah.
- Hook dipilih sesuai tema; data statistik hanya dipakai jika dapat diverifikasi.
- Setelah hook, pembahasan langsung masuk ke persoalan utama tanpa paragraf takwa umum yang terpisah dan tidak diperlukan.
- Penjelasan ulama harus masuk ke dalam naskah, bukan hanya dicantumkan pada daftar referensi.
- Dalil, teks Arab, kualitas hadis, atribusi ulama, dan tautan sumber tidak boleh dikarang.
- Khutbah kedua bersifat umum dan tidak terikat dengan tema khutbah pertama.
- Output memuat rancangan, naskah lengkap, referensi, dan estimasi durasi.

## Status integrasi

Frontend mengirim parameter `promptVersion=khutbah-ilmiah-v2` bersama tema. **Parameter ini belum mengaktifkan prompt baru dengan sendirinya.** Backend Google Apps Script yang dipanggil oleh aplikasi berada di luar repository ini dan source code-nya belum tersedia di sini.

Agar format baru benar-benar memengaruhi hasil AI, backend perlu diperbarui untuk:
1. membaca/menetapkan prompt generator versi `khutbah-ilmiah-v2`;
2. melakukan penelitian sumber Maktabah Syamilah melalui integrasi yang tersedia;
3. memasukkan penjelasan ulama ke naskah;
4. menghasilkan khutbah pertama dan khutbah kedua umum;
5. mengembalikan sumber dan status verifikasi secara jujur.

Jangan menganggap integrasi selesai hanya karena frontend mengirim versi prompt. Uji hasil dari backend setelah backend diperbarui.

## Keamanan dan PWA

- Jangan menaruh API key atau rahasia di frontend/repository.
- Keluaran AI di-escape sebelum ditampilkan sebagai HTML sederhana.
- Service worker didaftarkan dari frontend.
- Performa offline tetap perlu diuji. Tailwind masih dimuat dari CDN, sehingga tampilan penuh belum dijamin saat offline.
- Manifest masih menggunakan ikon placeholder eksternal dan perlu diganti dengan aset ikon lokal.

## Komponen

- `index.html` — antarmuka PWA dan pemanggilan backend.
- `manifest.json` — metadata instalasi PWA.
- `sw.js` — cache aset dasar.
- `PROMPT_GENERATOR_KHUTBAH.md` — spesifikasi prompt generator khutbah ilmiah v2.
- `AUDIT_AWAL.md` — hasil audit fondasi awal.

## Rencana lanjutan

1. Sinkronkan prompt versi 2 ke source Google Apps Script.
2. Pastikan kontrak respons mencakup naskah, dalil, referensi, dan status verifikasi.
3. Uji beberapa tema dengan hook berbeda.
4. Uji keamanan rendering, respons error, dan pengalaman online/offline.
5. Baru pertimbangkan penggabungan ke `main`.
