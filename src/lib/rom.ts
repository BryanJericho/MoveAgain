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

// Rep counter using local peak-valley detection.
// Each rep = one meaningful oscillation (up then down, or down then up),
// measured from the most recent turning point — not global session extremes.
// This works for any ROM zone: red, orange, or green.

export interface RepState {
  phase: 'idle' | 'rising' | 'falling'
  localPeak: number
  localValley: number
}

export const INITIAL_REP_STATE: RepState = { phase: 'idle', localPeak: 0, localValley: 0 }

export interface RepResult {
  newState: RepState
  repCompleted: boolean
}

const MIN_AMPLITUDE = 8  // minimum degrees peak-to-valley to count as a rep
const HYSTERESIS    = 4  // degrees of confirmed reversal before changing direction

export function updateRepState(angle: number, state: RepState): RepResult {
  const { phase, localPeak, localValley } = state

  if (phase === 'idle') {
    return { newState: { phase: 'rising', localPeak: angle, localValley: angle }, repCompleted: false }
  }

  if (phase === 'rising') {
    if (angle > localPeak) {
      return { newState: { phase: 'rising', localPeak: angle, localValley }, repCompleted: false }
    }
    if (angle <= localPeak - HYSTERESIS) {
      const repCompleted = (localPeak - localValley) >= MIN_AMPLITUDE
      return { newState: { phase: 'falling', localPeak, localValley: angle }, repCompleted }
    }
    return { newState: state, repCompleted: false }
  }

  // phase === 'falling'
  if (angle < localValley) {
    return { newState: { phase: 'falling', localPeak, localValley: angle }, repCompleted: false }
  }
  if (angle >= localValley + HYSTERESIS) {
    return { newState: { phase: 'rising', localPeak: angle, localValley }, repCompleted: false }
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
