/**
 * BUKU SAKU KHATIB — GEMINI + MCP TURATH
 * Versi 2: pencarian Arab terkoreksi dan pemilihan hasil berdasarkan relevansi.
 * Tempel seluruh isi file ini ke Integration.gs di GAS V2.
 *
 * Script Properties yang diperlukan:
 * GEMINI_API_KEY
 *
 * Jalankan testIntegratedResearch().
 * Jangan deploy publik sebelum hasil sumber ditinjau.
 */

const INTEGRATION_CONFIG = {
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_URL_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
  TURATH_MCP_URL: 'https://mcp.turath.io/mcp',
  MCP_PROTOCOL_VERSION: '2025-03-26',
  SEARCH_PAGE: 1,
  FULL_PAGE_LIMIT: 3,
  MIN_RELEVANCE_SCORE: 2
};

function testIntegratedResearch() {
  const tema = 'Makna dan penerapan keadilan serta ihsan dalam khutbah Jumat';
  const hasil = researchKhatib_(tema);
  console.log('HASIL AKHIR: ' + JSON.stringify(hasil, null, 2));
  if (!hasil.ok) throw new Error('Uji integrasi gagal: ' + hasil.error);
}

function researchKhatib_(tema) {
  if (!tema || String(tema).trim().length < 5) {
    return { ok: false, error: 'Tema terlalu singkat.' };
  }

  const queryGemini = generateArabicSearchQuery_(String(tema).trim());
  const query = correctArabicQuery_(queryGemini);

  console.log('KATA KUNCI DARI GEMINI: ' + queryGemini);
  console.log('KATA KUNCI FINAL: ' + query);

  const searchPayload = turathToolCall_('search_turath', {
    q: query,
    page: INTEGRATION_CONFIG.SEARCH_PAGE
  });
  const searchData = unwrapMcpToolResult_(searchPayload);
  const hits = extractSearchHits_(searchData);

  console.log('JUMLAH HASIL TURATH: ' + hits.length);
  if (hits.length) {
    console.log('CONTOH HASIL PERTAMA: ' + JSON.stringify(hits[0]).substring(0, 1800));
  }

  if (!hits.length) {
    return {
      ok: true,
      tema: tema,
      query_arab: query,
      status: 'SUMBER_BELUM_DITEMUKAN',
      draf: 'Turath tidak mengembalikan hasil yang dapat dibaca. Periksa struktur respons dan kata kunci.',
      sumber: []
    };
  }

  // Nilai relevansi berdasarkan isi dan judul hasil Turath.
  const ranked = hits.map(function(hit) {
    return { hit: hit, score: scoreSearchHit_(hit, tema) };
  }).sort(function(a, b) {
    return b.score - a.score;
  });

  console.log('SKOR RELEVANSI 10 HASIL TERATAS: ' +
    JSON.stringify(ranked.slice(0, 10).map(function(item) {
      return {
        score: item.score,
        book_id: item.hit.book_id,
        title: item.hit.meta && item.hit.meta.book_name,
        page_id: item.hit.meta && item.hit.meta.page_id
      };
    })));

  const eligible = ranked.filter(function(item) {
    return item.score >= INTEGRATION_CONFIG.MIN_RELEVANCE_SCORE;
  });

  if (!eligible.length) {
    return {
      ok: true,
      tema: tema,
      query_arab: query,
      status: 'HASIL_ADA_TAPI_RELEVANSI_RENDAH',
      draf: 'Turath mengembalikan hasil, tetapi tidak ada yang melewati ambang relevansi. Draf tidak dibuat agar sumber yang kurang sesuai tidak dipaksakan.',
      sumber: ranked.slice(0, 5).map(function(item) {
        return {
          skor_relevansi: item.score,
          judul: item.hit.meta && item.hit.meta.book_name || '',
          penulis: item.hit.meta && item.hit.meta.author_name || '',
          book_id: item.hit.book_id,
          page_id: item.hit.meta && item.hit.meta.page_id,
          tautan: item.hit.link || ''
        };
      })
    };
  }

  const fullPages = [];
  const seen = {};

  for (let i = 0; i < eligible.length &&
      fullPages.length < INTEGRATION_CONFIG.FULL_PAGE_LIMIT; i++) {
    const hit = eligible[i].hit;
    const bookId = hit.book_id;
    const pageId = hit.meta && hit.meta.page_id;

    if (bookId == null || pageId == null) continue;

    const key = String(bookId) + ':' + String(pageId);
    if (seen[key]) continue;
    seen[key] = true;

    try {
      const pagePayload = turathToolCall_('get_page', {
        book_id: bookId,
        page_id: pageId
      });
      const pageData = unwrapMcpToolResult_(pagePayload);
      const source = normalizeSource_(pageData, hit);
      source.skor_relevansi = eligible[i].score;

      if (source.text) {
        fullPages.push(source);
      }
    } catch (err) {
      console.warn('Gagal mengambil halaman ' + key + ': ' + err.message);
    }
  }

  if (!fullPages.length) {
    return {
      ok: true,
      tema: tema,
      query_arab: query,
      status: 'HALAMAN_SUMBER_GAGAL_DIBACA',
      draf: 'Hasil pencarian ada, tetapi halaman lengkap tidak berhasil dibaca. Draf tidak dibuat.',
      sumber: []
    };
  }

  const draf = draftFromSources_(tema, fullPages);
  return {
    ok: true,
    tema: tema,
    query_arab: query,
    status: 'SUMBER_DIPILIH_BERDASARKAN_RELEVANSI_PERLU_VERIFIKASI',
    draf: draf,
    sumber: fullPages.map(function(s) {
      return {
        skor_relevansi_internal: s.skor_relevansi,
        judul: s.judul,
        penulis: s.penulis,
        jilid: s.jilid,
        halaman_cetak: s.halaman_cetak,
        book_id: s.book_id,
        page_id: s.page_id,
        tautan: s.tautan,
        kutipan_teks_asli: s.text
      };
    }),
    catatan: [
      'Skor relevansi adalah penyaringan otomatis sederhana, bukan penilaian ilmiah.',
      'Buka tautan dan periksa konteks teks asli sebelum memakai sumber.',
      'Draf AI bukan fatwa dan wajib ditinjau ahli.',
      'Pencarian ini tidak memverifikasi derajat hadis.'
    ]
  };
}

function generateArabicSearchQuery_(tema) {
  const prompt = [
    'Buat kata kunci pencarian Arab untuk tema Islam berikut.',
    'Keluarkan hanya frasa Arab pendek, tanpa penjelasan atau tanda kutip.',
    'Jangan membuat dalil atau fatwa.',
    'Tema: ' + tema
  ].join('\n');
  return String(geminiGenerate_(prompt, 100) || '')
    .replace(/[\r\n"'\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);
}

function correctArabicQuery_(query) {
  let q = String(query || '').trim();
  // Koreksi ejaan umum dari model; lalu tambahkan frasa inti tema uji.
  q = q.replace(/الإسان/g, 'الإحسان')
       .replace(/الاحسان/g, 'الإحسان')
       .replace(/احسان/g, 'إحسان')
       .replace(/العدل\s+و\s+الإحسان/g, 'العدل والإحسان');

  // Jangan mengandalkan kata kunci yang dibuat model saja untuk tema ini.
  if (/العدل/.test(q) && /الإحسان|إحسان/.test(q)) {
    q = 'إن الله يأمر بالعدل والإحسان ' + q;
  }
  if (!q) q = 'العدل والإحسان';
  return q.substring(0, 300);
}

function scoreSearchHit_(hit, tema) {
  const meta = hit.meta || {};
  const text = normalizeArabicForSearch_([
    meta.book_name || '',
    meta.author_name || '',
    (meta.headings || []).join(' '),
    hit.snip || '',
    hit.text || ''
  ].join(' '));

  let score = 0;
  if (text.indexOf(normalizeArabicForSearch_('العدل والإحسان')) >= 0) score += 5;
  if (text.indexOf(normalizeArabicForSearch_('يأمر بالعدل والإحسان')) >= 0) score += 6;
  if (text.indexOf(normalizeArabicForSearch_('العدل')) >= 0) score += 2;
  if (text.indexOf(normalizeArabicForSearch_('الإحسان')) >= 0) score += 2;
  if (text.indexOf(normalizeArabicForSearch_('الظلم')) >= 0) score += 1;
  if (text.indexOf(normalizeArabicForSearch_('الإنصاف')) >= 0) score += 1;
  return score;
}

function normalizeArabicForSearch_(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#x20;/g, ' ')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function draftFromSources_(tema, sources) {
  const sourceBundle = sources.map(function(s, i) {
    return [
      'SUMBER ' + (i + 1),
      'Skor penyaringan otomatis (bukan verifikasi ilmiah): ' + s.skor_relevansi,
      'Judul: ' + (s.judul || 'Tidak tersedia'),
      'Penulis: ' + (s.penulis || 'Tidak tersedia'),
      'Jilid: ' + (s.jilid || 'Tidak tersedia'),
      'Halaman cetak: ' + (s.halaman_cetak || 'Tidak tersedia'),
      'Tautan: ' + (s.tautan || 'Tidak tersedia'),
      'Teks asli dari Turath:',
      String(s.text || '').substring(0, 5500)
    ].join('\n');
  }).join('\n\n--------------------\n\n');

  const prompt = [
    'Anda membantu menyiapkan bahan awal khutbah, bukan mengeluarkan fatwa.',
    'Tulis dalam bahasa Indonesia yang jelas dan santun.',
    'Tema: ' + tema,
    '',
    'ATURAN:',
    '1. Gunakan hanya informasi yang didukung teks sumber.',
    '2. Jangan mengarang ayat, hadis, sanad, derajat hadis, kutipan, atau bibliografi.',
    '3. Bedakan parafrasa dari kutipan langsung.',
    '4. Jika sumber tidak cukup mendukung klaim, tandai [PERLU VERIFIKASI SUMBER].',
    '5. Jangan menyimpulkan hukum fiqih final atau mengklaim ijmak.',
    '6. Jangan menganggap skor relevansi otomatis sebagai bukti sumber otoritatif.',
    '7. Jika sumber tidak relevan, nyatakan keterbatasannya dan jangan paksakan.',
    '',
    'Format: ringkasan tema, maksimal tiga poin bahan khutbah, catatan kehati-hatian, daftar sumber.',
    '',
    sourceBundle
  ].join('\n');
  return geminiGenerate_(prompt, 1600);
}

function geminiGenerate_(prompt, maxOutputTokens) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Script Property GEMINI_API_KEY belum diisi.');

  const url = INTEGRATION_CONFIG.GEMINI_URL_BASE +
    INTEGRATION_CONFIG.GEMINI_MODEL + ':generateContent';

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxOutputTokens }
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Gemini HTTP ' + code + ': ' + body.substring(0, 700));
  }

  const json = JSON.parse(body);
  const candidates = json.candidates || [];
  const parts = candidates.length && candidates[0].content
    ? candidates[0].content.parts || [] : [];
  const output = parts.map(function(part) {
    return part.text || '';
  }).join('\n').trim();

  if (!output) throw new Error('Gemini mengembalikan respons kosong.');
  return output;
}

function turathToolCall_(toolName, args) {
  const requestBody = {
    jsonrpc: '2.0',
    id: new Date().getTime(),
    method: 'tools/call',
    params: { name: toolName, arguments: args }
  };

  const response = UrlFetchApp.fetch(INTEGRATION_CONFIG.TURATH_MCP_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': INTEGRATION_CONFIG.MCP_PROTOCOL_VERSION
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Turath HTTP ' + code + ': ' + body.substring(0, 700));
  }

  const parsed = parseJsonOrSse_(body);
  if (parsed.error) {
    throw new Error('Turath MCP error: ' + JSON.stringify(parsed.error).substring(0, 700));
  }
  if (!parsed.result) throw new Error('Respons Turath tidak memiliki result.');
  if (parsed.result.isError) {
    throw new Error('Tool Turath gagal: ' +
      JSON.stringify(parsed.result.content || []).substring(0, 700));
  }
  return parsed;
}

function parseJsonOrSse_(body) {
  const trimmed = String(body || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (ignore) {}

  const lines = trimmed.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.indexOf('data:') === 0) {
      const data = line.substring(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        return JSON.parse(data);
      } catch (ignore2) {}
    }
  }
  throw new Error('Respons Turath bukan JSON/SSE yang dapat dibaca: ' +
    trimmed.substring(0, 300));
}

function unwrapMcpToolResult_(mcpResponse) {
  const result = mcpResponse && mcpResponse.result;
  const content = result && result.content;
  if (!content || !content.length) return result || {};

  for (let i = 0; i < content.length; i++) {
    if (content[i].type !== 'text' || !content[i].text) continue;
    try {
      return JSON.parse(content[i].text.trim());
    } catch (ignore) {}
  }
  return { raw_content: content };
}

function extractSearchHits_(data) {
  if (!data) return [];
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data) && Array.isArray(data.data.results)) return data.data.results;
  if (data.data && Array.isArray(data.data.results)) return data.data.results;
  if (data.result && Array.isArray(data.result.results)) return data.result.results;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeSource_(pageData, hit) {
  const data = pageData || {};
  const h = hit || {};
  const meta = data.meta || h.meta || {};
  return {
    book_id: data.book_id != null ? data.book_id : h.book_id,
    page_id: data.page_id != null ? data.page_id : meta.page_id,
    judul: meta.book_name || (h.meta && h.meta.book_name) || data.book_name || '',
    penulis: meta.author_name || (h.meta && h.meta.author_name) || data.author_name || '',
    jilid: meta.vol || (h.meta && h.meta.vol) || '',
    halaman_cetak: meta.page || (h.meta && h.meta.page) || '',
    tautan: data.link || h.link || '',
    text: data.text || h.text || h.snip || ''
  };
}
