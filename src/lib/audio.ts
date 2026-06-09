// Web Speech API wrapper for rehabilitation audio feedback.
// No external dependencies — works offline, supports Indonesian.

const STORAGE_KEY = 'moveagain_audio'

export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isAudioEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === null ? true : v === 'true'   // default ON
  } catch { return true }
}

export function setAudioEnabled(enabled: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, String(enabled)) } catch {}
  if (!enabled) window.speechSynthesis?.cancel()
}

function speak(text: string, interrupt = true): void {
  if (!isAudioSupported() || !isAudioEnabled()) return
  if (interrupt) window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang    = 'id-ID'
  u.rate    = 0.92
  u.pitch   = 1.05
  u.volume  = 1.0
  window.speechSynthesis.speak(u)
}

// Indonesian number words 1–30; beyond 30 we fall back to digits spoken by TTS
const ID_NUM: Record<number, string> = {
  1:'Satu', 2:'Dua', 3:'Tiga', 4:'Empat', 5:'Lima',
  6:'Enam', 7:'Tujuh', 8:'Delapan', 9:'Sembilan', 10:'Sepuluh',
  11:'Sebelas', 12:'Dua belas', 13:'Tiga belas', 14:'Empat belas',
  15:'Lima belas', 16:'Enam belas', 17:'Tujuh belas', 18:'Delapan belas',
  19:'Sembilan belas', 20:'Dua puluh', 25:'Dua puluh lima', 30:'Tiga puluh',
}

function toId(n: number): string {
  if (ID_NUM[n]) return ID_NUM[n]
  if (n > 20 && n < 30) return `Dua puluh ${ID_NUM[n - 20]?.toLowerCase() ?? n - 20}`
  return String(n)
}

// Milestone messages (fired at rep 5, 10, 15, 20, 25, 30, then every 10)
const PRAISE = ['Bagus sekali!', 'Luar biasa!', 'Terus semangat!', 'Hebat!', 'Kerja keras Anda luar biasa!']
let praiseIdx = 0

function milestone(n: number): string | null {
  if (n === 5)  return `${toId(n)}! Bagus sekali.`
  if (n === 10) return `${toId(n)}! Luar biasa!`
  if (n % 5 === 0) {
    const praise = PRAISE[praiseIdx % PRAISE.length]
    praiseIdx++
    return `${toId(n)}! ${praise}`
  }
  return null
}

export function announceRep(count: number): void {
  const msg = milestone(count) ?? toId(count)
  speak(msg)
}

export function announceSessionStart(exerciseName?: string): void {
  praiseIdx = 0
  speak(exerciseName ? `Mulai! ${exerciseName}. Ayo semangat.` : 'Mulai! Ayo semangat.')
}

export function announceSessionEnd(repCount: number): void {
  if (repCount === 0) {
    speak('Latihan selesai.')
    return
  }
  speak(`Latihan selesai. ${toId(repCount)} repetisi. Kerja bagus!`)
}

// Throttle: announce at most once every 8 seconds during recording
let _lastWarnTime = 0
export function warnNoDetection(): void {
  const now = Date.now()
  if (now - _lastWarnTime < 8000) return
  _lastWarnTime = now
  speak('Posisikan tubuh di depan kamera.', false)
}

export function resetWarnThrottle(): void {
  _lastWarnTime = 0
}
