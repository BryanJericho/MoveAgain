export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export interface PatientContext {
  name: string
  affectedSide: string
  recentSessions: {
    date: string
    exerciseName: string
    maxRom: number
    avgRom: number
    reps: number
  }[]
  bestRomByExercise: Record<string, number>
  totalSessions: number
  streakDays: number
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SYSTEM_PROMPT = `Kamu adalah asisten konsultasi virtual "Move Again" untuk pasien pemulihan pasca-stroke.
Tugasmu:
- Menjawab pertanyaan tentang kondisi pemulihan dengan empati dan dalam Bahasa Indonesia yang sederhana
- Memberikan motivasi berdasarkan data progres nyata pasien yang diberikan
- Memberikan panduan umum latihan sesuai panduan fisioterapi
- TIDAK memberikan diagnosis medis, interpretasi lab, atau perubahan dosis obat

Jika pertanyaan di luar cakupan yang kamu boleh jawab (seperti diagnosis atau resep obat), berikan disclaimer dan arahkan ke dokter/fisioterapis.

Dalam kondisi darurat, tampilkan: "🚨 SEGERA hubungi dokter atau IGD terdekat: 119"

Selalu akhiri respons dengan kalimat motivasi singkat.`

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }> }
  }>
  error?: { message: string; status: string }
}

async function callGemini(body: object, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json() as GeminiResponse

    if (response.ok && !data.error) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    }

    const msg = data.error?.message ?? `Gemini error ${response.status}`
    const isHighDemand = msg.includes('high demand') || response.status === 503
    const isRetryable = msg.includes('Please retry in') || isHighDemand

    if (isRetryable && attempt < retries) {
      // Extract suggested wait time, fallback to exponential backoff
      const match = msg.match(/retry in ([\d.]+)s/)
      const waitMs = match ? Math.ceil(parseFloat(match[1])) * 1000 : attempt * 2000
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }

    throw new Error(msg)
  }
  throw new Error('Gagal setelah beberapa percobaan. Coba lagi.')
}

export async function sendChatMessage(
  messages: ChatMsg[],
  patientContext?: PatientContext
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY belum dikonfigurasi di .env.local')
  }

  const contextBlock = patientContext
    ? `\n\n[DATA PASIEN]\n${JSON.stringify(patientContext, null, 2)}`
    : ''

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  return callGemini({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT + contextBlock }] },
    contents,
    generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
  })
}

export const QUICK_QUESTIONS = [
  'Apakah wajar jika lengan saya masih kaku setelah latihan?',
  'Berapa kali sehari saya harus berlatih?',
  'Bagaimana cara meningkatkan ROM bahu saya?',
  'Apa yang harus saya lakukan jika terasa nyeri saat latihan?',
  'Bagaimana cara membaca grafik ROM saya?',
  'Kapan saya bisa melihat hasil nyata dari latihan ini?'
]
