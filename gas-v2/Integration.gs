/**
 * Buku Saku Khatib — integrasi Gemini + MCP Turath
 * File ini berdiri sendiri. Tempelkan ke project GAS V2 sebagai file Integration.gs.
 * Rahasia hanya dibaca dari Script Properties:
 *   GEMINI_API_KEY
 *
 * Belum untuk deployment publik. Uji manual dengan testIntegratedResearch().
 */

const INTEGRATION_CONFIG = {
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_URL_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/',
  TURATH_MCP_URL: 'https://mcp.turath.io/mcp',
  MCP_PROTOCOL_VERSION: '2025-03-26',
  SEARCH_LIMIT: 5,
  FULL_PAGE_LIMIT: 3
};

/**
 * Uji pipeline lengkap. Ubah tema uji bila diperlukan.
 * Hasil tampil di Execution log; jangan masukkan API key ke log.
 */
function testIntegratedResearch() {
  const tema = 'Makna dan penerapan keadilan serta ihsan dalam khutbah Jumat';
  const hasil = researchKhatib_(tema);
  console.log(JSON.stringify(hasil, null, 2));
  if (!hasil.ok) throw new Error('Uji integrasi gagal: ' + hasil.error);
}

/**
 * Pipeline: Gemini hanya menyusun kata kunci pencarian,
 * Turath mengambil sumber, lalu Gemini menyusun draf berdasarkan sumber itu.
 */
function researchKhatib_(tema) {
  if (!tema || String(tema).trim().length < 5) {
    return { ok: false, error: 'Tema terlalu singkat.' };
  }

  const query = generateArabicSearchQuery_(String(tema).trim());
  const searchPayload = turathToolCall_('search_turath', {
    q: query,
    page: 1,
    limit: INTEGRATION_CONFIG.SEARCH_LIMIT
  });
  const searchData = unwrapMcpToolResult_(searchPayload);

  const hits = extractSearchHits_(searchData);
  if (!hits.length) {
    return {
      ok: true,
      tema: tema,
      query_arab: query,
      status: 'SUMBER_BELUM_DITEMUKAN',
      draf: 'Belum ditemukan sumber Turath yang dapat dipakai untuk menyusun draf. Coba ubah tema atau kata kunci Arab, lalu verifikasi secara manual.',
      sumber: []
    };
  }

  const fullPages = [];
  const seen = {};
  for (let i = 0; i < hits.length && fullPages.length < INTEGRATION_CONFIG.FULL_PAGE_LIMIT; i++) {
    const hit = hits[i];
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
      if (source.text) fullPages.push(source);
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
      draf: 'Hasil pencarian ditemukan, tetapi teks halaman penuh belum berhasil diambil. Jangan gunakan hasil ini sebagai dasar kutipan sebelum diperiksa.',
      sumber: hits.slice(0, 3).map(function(h) { return normalizeSource_(null, h); })
    };
  }

  const draf = draftFromSources_(tema, fullPages);
  return {
    ok: true,
    tema: tema,
    query_arab: query,
    status: 'SUMBER_DITEMUKAN_PERLU_VERIFIKASI_MANUSIA',
    draf: draf,
    sumber: fullPages.map(function(s) {
      return {
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
      'Sumber dan tautan berasal dari hasil MCP Turath.',
      'Draf AI bukan fatwa dan wajib diperiksa oleh manusia yang kompeten.',
      'Jangan menganggap teks hasil pencarian sebagai verifikasi derajat hadis.',
      'Pastikan kutipan, konteks, halaman, dan kesesuaian pendapat diperiksa pada sumber asli.'
    ]
  };
}

function generateArabicSearchQuery_(tema) {
  const prompt = [
    'Anda bertugas menyusun kata kunci pencarian katalog teks Islam berbahasa Arab.',
    'Dari tema berikut, hasilkan 2 sampai 5 frasa pencarian Arab yang ringkas dan relevan.',
    'Jangan memberi fatwa, penjelasan, dalil, kutipan, nomor hadis, atau nama kitab.',
    'Keluarkan HANYA frasa Arab dipisahkan spasi; tanpa JSON, tanpa penjelasan.',
    'Tema: ' + tema
  ].join('\n');

  const raw = geminiGenerate_(prompt, 100);
  const query = String(raw || '').replace(/[\r\n"'\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!query) throw new Error('Gemini tidak menghasilkan kata kunci pencarian.');
  return query.substring(0, 300);
}

function draftFromSources_(tema, sources) {
  const sourceBundle = sources.map(function(s, i) {
    return [
      'SUMBER ' + (i + 1),
      'Judul: ' + (s.judul || 'Tidak tersedia'),
      'Penulis: ' + (s.penulis || 'Tidak tersedia'),
      'Jilid: ' + (s.jilid || 'Tidak tersedia'),
      'Halaman cetak: ' + (s.halaman_cetak || 'Tidak tersedia'),
      'Tautan: ' + (s.tautan || 'Tidak tersedia'),
      'Teks asli dari Turath:',
      String(s.text || '').substring(0, 6500)
    ].join('\n');
  }).join('\n\n--------------------\n\n');

  const prompt = [
    'Anda membantu menyusun bahan awal khutbah, bukan mengeluarkan fatwa.',
    'Tulis dalam bahasa Indonesia yang jelas dan santun.',
    'Tema: ' + tema,
    '',
    'ATURAN WAJIB:',
    '1. Gunakan hanya informasi yang benar-benar didukung teks sumber di bawah.',
    '2. Jangan menciptakan ayat, hadis, sanad, derajat hadis, nama kitab, penulis, jilid, halaman, atau kutipan.',
    '3. Bedakan dengan jelas ringkasan/parafrasa dari kutipan langsung.',
    '4. Jika teks tidak cukup mendukung klaim, tulis [PERLU VERIFIKASI SUMBER], jangan menebak.',
    '5. Jangan menyimpulkan hukum fiqih final atau mengklaim ijmak.',
    '6. Akhiri dengan daftar sumber yang tersedia; jangan menambahkan detail bibliografi yang tidak disediakan.',
    '7. Nyatakan bahwa draf perlu ditinjau oleh khatib/ahli sebelum digunakan.',
    '',
    'Format: Ringkasan tema; poin khutbah (maksimal 3); catatan kehati-hatian; daftar sumber.',
    '',
    sourceBundle
  ].join('\n');

  return geminiGenerate_(prompt, 1800);
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
      generationConfig: {
        temperature: 0,
        maxOutputTokens: maxOutputTokens
      }
    }),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Gemini HTTP ' + code + ': ' + body.substring(0, 700));
  }

  const json = JSON.parse(body);
  const textParts = [];
  (((json.candidates || [])[0] || {}).content || {}).parts &&
    json.candidates[0].content.parts.forEach(function(part) {
      if (part.text) textParts.push(part.text);
    });

  const output = textParts.join('\n').trim();
  if (!output) throw new Error('Gemini mengembalikan respons kosong.');
  return output;
}

function turathToolCall_(toolName, args) {
  const requestBody = {
    jsonrpc: '2.0',
    id: new Date().getTime(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = UrlFetchApp.fetch(INTEGRATION_CONFIG.TURATH_MCP_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Accept': 'application/json, text/event-stream',
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
    throw new Error('Tool Turath gagal: ' + JSON.stringify(parsed.result.content || []).substring(0, 700));
  }
  return parsed;
}

function parseJsonOrSse_(body) {
  const trimmed = String(body || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (ignore) {}

  // Dukungan Server-Sent Events: cari baris data: yang berisi JSON-RPC.
  const lines = trimmed.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.indexOf('data:') === 0) {
      const data = line.substring(5).trim();
      if (!data || data === '[DONE]') continue;
      try { return JSON.parse(data); } catch (ignore2) {}
    }
  }
  throw new Error('Respons bukan JSON atau SSE yang dapat diparse: ' + trimmed.substring(0, 300));
}

function unwrapMcpToolResult_(mcpResponse) {
  const result = mcpResponse && mcpResponse.result;
  const content = result && result.content;
  if (!content || !content.length) return result || {};

  for (let i = 0; i < content.length; i++) {
    if (content[i].type !== 'text' || !content[i].text) continue;
    const txt = content[i].text.trim();
    try { return JSON.parse(txt); } catch (ignore) {}
  }
  return { raw_content: content };
}

function extractSearchHits_(data) {
  if (!data) return [];
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeSource_(pageData, hit) {
  const data = pageData || {};
  const meta = data.meta || hit.meta || {};
  return {
    book_id: data.book_id != null ? data.book_id : hit.book_id,
    page_id: data.page_id != null ? data.page_id : meta.page_id,
    judul: meta.book_name || hit.meta && hit.meta.book_name || data.book_name || '',
    penulis: meta.author_name || hit.meta && hit.meta.author_name || data.author_name || '',
    jilid: meta.vol || hit.meta && hit.meta.vol || '',
    halaman_cetak: meta.page || hit.meta && hit.meta.page || '',
    tautan: data.link || hit.link || '',
    text: data.text || hit.text || hit.snip || ''
  };
}
