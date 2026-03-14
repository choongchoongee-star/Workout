const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const CARDIO_PROMPT = `This is a photo of a cardio machine display (treadmill, bike, rowing machine, etc.).
Extract the workout data shown and return ONLY a JSON object with these fields (use null if not visible):
{
  "duration_min": number,
  "distance_km": number,
  "speed_kmh": number,
  "incline_pct": number,
  "calories": number
}
Do not include markdown or any text outside the JSON.`

function apiHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,  // Use header instead of URL param to avoid leaking in logs/history
  }
}

function parseGeminiJson(text) {
  // Direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Extract first JSON object — bounded to prevent ReDoS
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end > start && end - start < 2000) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw new Error('Gemini 응답을 파싱할 수 없습니다')
  }
}

export async function extractCardioFromPhoto(apiKey, imageBase64, mimeType = 'image/jpeg') {
  if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다')

  // Validate MIME type before sending to API
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`지원하지 않는 파일 형식입니다: ${mimeType}`)
  }

  const body = {
    contents: [{
      parts: [
        { text: CARDIO_PROMPT },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: { temperature: 0 },
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API 오류 (${res.status})`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini 응답이 비어있습니다')

  return parseGeminiJson(text)
}

export async function testGeminiKey(apiKey) {
  if (!apiKey) throw new Error('Gemini API 키가 없습니다')
  const body = {
    contents: [{ parts: [{ text: 'Reply with the word OK only.' }] }],
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('API 키가 유효하지 않습니다')
}
