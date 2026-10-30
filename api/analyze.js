/**
 * Vercel Serverless Function: /api/analyze
 * Proxies hematology analysis requests to Google Gemini API.
 * Keeps GEMINI_API_KEY secure in Vercel Environment Variables.
 * Enforces rate limiting per IP and detects Gemini quota exhaustion.
 */

// In-memory rate limiting map: IP -> { count, startTime }
// Limits each client IP to max 25 requests per hour to preserve central quota
const rateLimitMap = new Map();
const MAX_REQUESTS_PER_IP_PER_HOUR = 25;
const ONE_HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip);

  // Periodically clean up old entries to prevent memory leaks
  if (rateLimitMap.size > 2000) {
    for (const [key, data] of rateLimitMap.entries()) {
      if (now - data.startTime > ONE_HOUR_MS) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!clientData || now - clientData.startTime > ONE_HOUR_MS) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_IP_PER_HOUR - 1, resetMinutes: 60 };
  }

  if (clientData.count >= MAX_REQUESTS_PER_IP_PER_HOUR) {
    const resetMinutes = Math.ceil((clientData.startTime + ONE_HOUR_MS - now) / 60000);
    return { allowed: false, remaining: 0, resetMinutes };
  }

  clientData.count += 1;
  const resetMinutes = Math.ceil((clientData.startTime + ONE_HOUR_MS - now) / 60000);
  return { allowed: true, remaining: MAX_REQUESTS_PER_IP_PER_HOUR - clientData.count, resetMinutes };
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'method_not_allowed',
      message: 'Method Not Allowed. Use POST.'
    });
  }

  // Extract client IP address
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.socket?.remoteAddress || 'unknown-client');

  // Rate Limiting check
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `คุณใช้งาน AI กลางครบขีดจำกัดชั่วคราวแล้ว (${MAX_REQUESTS_PER_IP_PER_HOUR} ครั้ง/ชม.) กรุณารออีก ${rateLimit.resetMinutes} นาที หรือใส่ Gemini API Key ส่วนตัวของคุณในปุ่ม "ตั้งค่า Gemini API" เพื่อใช้งานได้ไม่จำกัด`
    });
  }

  // Get server-side Central API Key from Environment Variables
  const centralApiKey = process.env.GEMINI_API_KEY;

  if (!centralApiKey || !centralApiKey.trim()) {
    return res.status(503).json({
      error: 'no_central_key',
      message: 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Vercel Environment Variables กรุณาใส่ Gemini API Key ส่วนตัวของคุณในหน้าต่างตั้งค่า'
    });
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'invalid_json', message: 'Invalid JSON payload' });
    }
  }

  const { prompt, model = 'gemini-2.0-flash' } = body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'missing_prompt',
      message: 'กรุณาส่งข้อความ prompt สำหรับการวิเคราะห์'
    });
  }

  // Models to attempt in order of priority (handles fallbacks)
  const candidateModels = [
    model,
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastErrorDetail = '';

  for (const currentModel of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${centralApiKey.trim()}`;

      const geminiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            maxOutputTokens: 2500
          }
        })
      });

      if (!geminiRes.ok) {
        let errJson = null;
        try {
          errJson = await geminiRes.json();
        } catch {
          // Ignore parse error
        }

        const errMsg = errJson?.error?.message || geminiRes.statusText;
        lastErrorDetail = errMsg;

        // Check if Quota Exceeded (429 or RESOURCE_EXHAUSTED)
        const isQuota = geminiRes.status === 429 || 
          errMsg.toLowerCase().includes('quota') || 
          errMsg.toLowerCase().includes('resource_exhausted') ||
          errMsg.toLowerCase().includes('limit');

        if (isQuota) {
          return res.status(429).json({
            error: 'quota_exhausted',
            message: '⚠️ โควต้าการใช้งาน AI กลางของระบบเต็มแล้วสำหรับวันนี้ หรือเครดิตหมดชั่วคราว คุณสามารถใส่ Gemini API Key ส่วนตัว (ใช้งานฟรีจาก Google AI Studio) ในปุ่ม "ตั้งค่า Gemini API" เพื่อวิเคราะห์ต่อได้ทันที'
          });
        }

        // If 404 Model Not Found, continue to fallback model
        if (geminiRes.status === 404) {
          continue;
        }

        // Other API errors (e.g. 400 Bad Request, 403 Forbidden)
        throw new Error(errMsg);
      }

      const data = await geminiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('ไม่ได้รับข้อความตอบกลับจากโมเดล Gemini');
      }

      // Success
      return res.status(200).json({
        success: true,
        text,
        modelUsed: currentModel,
        remainingRequests: rateLimit.remaining
      });
    } catch (err) {
      lastErrorDetail = err.message;
    }
  }

  // All attempts failed
  return res.status(502).json({
    error: 'gemini_error',
    message: `การเชื่อมต่อ Gemini AI ขัดข้อง: ${lastErrorDetail || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ AI ได้'}`
  });
}

