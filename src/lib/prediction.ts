const PREDICTION_API_URL = import.meta.env.VITE_PREDICTION_API_URL ?? 'http://localhost:8000'

export const JOINT_NAME_MAP: Record<string, string> = {
  elbow_right: 'Siku',
  elbow_left: 'Siku',
  shoulder_right: 'Bahu',
  shoulder_left: 'Bahu',
  knee_right: 'Lutut',
  knee_left: 'Lutut',
  ankle_right: 'Ankle',
  ankle_left: 'Ankle',
  index_pip: 'Jari',
  middle_pip: 'Jari',
  ring_pip: 'Jari',
  pinky_pip: 'Jari',
  thumb_ip: 'Jari',
  index_mcp: 'Jari',
}

export interface PredictionResult {
  status: string
  input_sesi: number
  prediksi: {
    median_hari: number
    ci_95_lower: number
    ci_95_upper: number
    probabilitas_90_hari_persen: number
  }
  pesan: string
}

export async function predictRecovery(params: {
  usia: number
  jenis_stroke: 'Hemoragik' | 'Iskemik'
  hari_onset: number
  skor_konsentrasi: number
  jenis_sendi: string
  rom_history: number[]
}): Promise<PredictionResult> {
  const res = await fetch(`${PREDICTION_API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { pesan?: string }
    throw new Error(err.pesan ?? `HTTP ${res.status}`)
  }
  return res.json()
}
