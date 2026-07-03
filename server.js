const COUNTRY_LABELS = {
  us: '🇺🇸 US',
  sg: '🇸🇬 Singapore',
  nl: '🇳🇱 Belanda',
};

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(allowedOrigin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, allowedOrigin);
    }


    if (env.ALLOWED_PATH) {
      const referer = request.headers.get('Referer') || '';
      if (!referer.includes(env.ALLOWED_PATH)) {
        return jsonResponse({ ok: false, error: 'Sumber request tidak diizinkan' }, 403, allowedOrigin);
      }
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return jsonResponse({ ok: false, error: 'Data tidak valid' }, 400, allowedOrigin);
    }

    if (data.website) {
      return jsonResponse({ ok: true }, 200, allowedOrigin);
    }

    const country = sanitize(data.country);
    const channel = sanitize(data.channel);
    const telegramUsername = sanitize(data.telegram_username);
    const whatsapp = sanitize(data.whatsapp);
    const email = sanitize(data.email);

    // Validasi wajib
    if (!telegramUsername) {
      return jsonResponse({ ok: false, error: 'Username Telegram wajib diisi' }, 400, allowedOrigin);
    }
    if (!country || !COUNTRY_LABELS[country]) {
      return jsonResponse({ ok: false, error: 'Negara tidak valid' }, 400, allowedOrigin);
    }
    if (email && !isValidEmail(email)) {
      return jsonResponse({ ok: false, error: 'Format email tidak valid' }, 400, allowedOrigin);
    }

    const cleanUsername = telegramUsername.startsWith('@')
      ? telegramUsername
      : `@${telegramUsername}`;

    const now = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const lines = [
      '🔔 ORDER PRIVATE PROXY BARU',
      '',
      `Negara       : ${COUNTRY_LABELS[country]}`,
      `Channel promo: ${channel || '-'}`,
      `Telegram     : ${cleanUsername}`,
      `WhatsApp     : ${whatsapp || '-'}`,
      `Email        : ${email || '-'}`,
      `Harga        : Rp20.000 / bulan`,
      '',
      `Waktu: ${now} WIB`,
    ];

    const text = lines.join('\n');

    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    let tgResp;
    try {
      tgResp = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text,
        }),
      });
    } catch (e) {
      return jsonResponse({ ok: false, error: 'Gagal menghubungi Telegram' }, 502, allowedOrigin);
    }

    if (!tgResp.ok) {
      const errText = await tgResp.text();
      return jsonResponse(
        { ok: false, error: 'Telegram menolak pesan', detail: errText },
        502,
        allowedOrigin
      );
    }

    return jsonResponse({ ok: true }, 200, allowedOrigin);
  },
};

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 200);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
