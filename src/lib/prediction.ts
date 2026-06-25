const PREDICTION_API_URL = import.meta.env.VITE_PREDICTION_API_URL ?? 'http://localhost:8000'

// Label tampilan untuk user (Indonesia)
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

// Nama sendi untuk API — harus exact match dengan levels_sendi di model R
export const JOINT_API_MAP: Record<string, string> = {
  elbow_right:    'Elbow_Flexion',
  elbow_left:     'Elbow_Flexion',
  shoulder_right: 'Shoulder_Abduction',
  shoulder_left:  'Shoulder_Abduction',
  knee_right:     'Knee_Flexion',
  knee_left:      'Knee_Flexion',
  ankle_right:    'Ankle_Dorsiflexion',
  ankle_left:     'Ankle_Dorsiflexion',
  index_pip:      'PIP_Index_Flexion',
  middle_pip:     'PIP_Middle_Flexion',
  ring_pip:       'PIP_Ring_Flexion',
  pinky_pip:      'PIP_Little_Flexion',
  thumb_ip:       'IP_Thumb_Flexion',
  index_mcp:      'MCP_Index_Flexion',
}

export interface PredictionResult {
  status: string
  input_sesi: number
  prediksi: {
    median_sesi_pulih: number
    ci_95_lower: number
    ci_95_upper: number
    sisa_sesi_dibutuhkan: number
    probabilitas_pulih_persen: number
  }
  pesan: string
}

export async function predictRecovery(params: {
  usia: number
  jenis_stroke: 'Hemoragik' | 'Iskemik'
  hari_onset: number
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
