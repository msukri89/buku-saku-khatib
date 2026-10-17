# Buku Saku Khatib

PWA untuk membantu khatib membaca materi khutbah, menyusun naskah khutbah pertama dan kedua, serta menelusuri dalil Al-Qur'an dan hadis beserta sumbernya.

## Status

Repositori lama dipertahankan. Pengembangan ulang dimulai pada branch `rebuild/foundation-v1`; branch `main` tidak diubah.

Baca [Audit Awal](AUDIT_AWAL.md) sebelum melanjutkan perubahan kode.

## Prinsip pengembangan

- Utamakan pengalaman mobile dan materi yang bisa dibaca offline.
- Jangan menaruh kunci API di frontend atau di repositori.
- Jangan menyajikan kutipan Arab, referensi, atau status kesahihan yang belum diverifikasi sebagai fakta.
- Perubahan diuji di branch pengembangan sebelum digabung ke `main`.

## Komponen awal

- `index.html` — antarmuka PWA.
- `manifest.json` — metadata pemasangan aplikasi.
- `sw.js` — service worker untuk cache offline.
- `AUDIT_AWAL.md` — temuan audit dan rencana kerja.

## Pengembangan berikutnya

Audit backend Google Apps Script diperlukan sebelum generator diubah, agar kontrak respons dan validasi materi dapat dirancang dengan benar.
