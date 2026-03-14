const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const PROMPT = `This is a photo of a cardio machine display (treadmill, bike, rowing machine, etc.).
Extract the workout data shown and return ONLY a JSON object with these fields (use null if not visible):
{
  "duration_min": number,
  "distance_km": number,
  "speed_kmh": number,
  "incline_pct": number,
  "calories": number
}
Do not include markdown or any text outside the JSON.`

export async function extractCardioFromPhoto(apiKey, imageBase64, mimeType = 'image/jpeg') {
  if (!apiKey) throw new Error('Gemini API 키가 설정되지 않았습니다')

  const body = {
    contents: [{
      parts: [
        { text: PROMPT },
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64,
          },
        },
      ],
    }],
    generationConfig: { temperature: 0 },
  }

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Gemini 응답이 비어있습니다')

  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from response
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Gemini 응답을 파싱할 수 없습니다')
  }
}

export async function testGeminiKey(apiKey) {
  if (!apiKey) throw new Error('Gemini API 키가 없습니다')
  const body = {
    contents: [{ parts: [{ text: 'Reply with the word OK only.' }] }],
  }
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('API 키가 유효하지 않습니다')
}
