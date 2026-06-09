export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y }
  const bc = { x: c.x - b.x, y: c.y - b.y }

  const dot = ba.x * bc.x + ba.y * bc.y
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2)
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2)

  if (magBA < 1e-6 || magBC < 1e-6) return 0

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

export function calculateAngle3D(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) }
  const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) }

  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2)
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2)

  if (magBA < 1e-6 || magBC < 1e-6) return 0

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

export function getVisibilityScore(landmarks: Landmark[], indices: number[]): number {
  const scores = indices.map(i => landmarks[i]?.visibility ?? 0)
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function applyLowPassFilter(prev: number, current: number, alpha = 0.3): number {
  return alpha * current + (1 - alpha) * prev
}

export type RepState = 'idle' | 'high' | 'low'

export interface RepResult {
  newState: RepState
  repCompleted: boolean
}

export function updateRepState(
  angle: number,
  state: RepState,
  sessionMin: number,
  sessionMax: number
): RepResult {
  const range = sessionMax - sessionMin

  // Butuh minimal 8° gerakan sebelum mulai hitung rep (filter noise)
  if (range < 8) return { newState: state, repCompleted: false }

  const highThreshold = sessionMin + range * 0.75
  const lowThreshold  = sessionMin + range * 0.25

  if (state === 'idle' || state === 'low') {
    if (angle >= highThreshold) {
      return { newState: 'high', repCompleted: false }
    }
  } else if (state === 'high') {
    if (angle <= lowThreshold) {
      return { newState: 'low', repCompleted: true }
    }
  }

  return { newState: state, repCompleted: false }
}

export function getRomPercentage(angle: number, normalMax: number): number {
  return Math.min(100, Math.round((angle / normalMax) * 100))
}

export function getRomColor(percentage: number): string {
  if (percentage >= 80) return '#22c55e'
  if (percentage >= 50) return '#f59e0b'
  return '#ef4444'
}
