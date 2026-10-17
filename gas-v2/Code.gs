/**
 * Buku Saku Khatib Backend V2
 * Tahap 1: tes koneksi Gemini API.
 *
 * Keamanan:
 * - Jangan menaruh API key di source code.
 * - Simpan di Apps Script > Project Settings > Script Properties:
 *   GEMINI_API_KEY = (isi key secara langsung di Script Properties)
 * - Jangan deploy Web App dulu. Jalankan testGeminiConnection() dari editor.
 */

function testGeminiConnection() {
  const apiKey = PropertiesService
    .getScriptProperties()
    .getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error(
      'Properti GEMINI_API_KEY belum ditemukan. Tambahkan melalui Project Settings > Script Properties.'
    );
  }

  // Model ini tercantum pada dokumentasi Gemini API dan memiliki harga free tier.
  // Kuota dan akses aktual tetap bergantung pada akun/project.
  const model = 'gemini-3.5-flash-lite';
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    model +
    ':generateContent';

  const payload = {
    contents: [
      {
        parts: [
          {
            text: 'Balas tepat dengan teks ini saja: KONEKSI GEMINI BERHASIL'
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 32
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-goog-api-key': apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const responseText = response.getContentText();

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(
      'Gemini mengembalikan respons yang bukan JSON. HTTP ' + status +
      '. Periksa status layanan dan konfigurasi model.'
    );
  }

  if (status < 200 || status >= 300) {
    const message =
      data && data.error && data.error.message
        ? data.error.message
        : 'Tidak ada rincian error dari provider.';
    // Jangan log request headers atau nilai API key.
    throw new Error('Gemini API gagal. HTTP ' + status + '. Pesan: ' + message);
  }

  const candidates = data.candidates || [];
  const parts =
    candidates.length && candidates[0].content
      ? (candidates[0].content.parts || [])
      : [];

  const answer = parts
    .map(function (part) { return part.text || ''; })
    .join('')
    .trim();

  if (!answer) {
    throw new Error(
      'Gemini merespons tanpa teks. Periksa safety feedback, model, atau kuota.'
    );
  }

  Logger.log('Status: KONEKSI GEMINI BERHASIL');
  Logger.log('Model: ' + model);
  Logger.log('Jawaban uji: ' + answer);
}
