import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Play, Square, CheckCircle2, FlipHorizontal, Volume2, VolumeX } from 'lucide-react'
import {
  isAudioEnabled, setAudioEnabled,
  announceRep, announceSessionStart, announceSessionEnd,
  warnNoDetection, resetWarnThrottle,
} from '../lib/audio'
import { useAppStore } from '../store/useAppStore'
import { addSession } from '../lib/db'
import {
  initPoseLandmarker, initHandLandmarker,
  drawPoseOverlay, drawHandOverlay, drawAngleLabel,
  type PoseLandmarkerResult, type HandLandmarkerResult
} from '../lib/mediapipe'
import type { PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision'
import {
  calculateAngle, getVisibilityScore, applyLowPassFilter,
  updateRepState, getRomPercentage, getRomColor,
  INITIAL_REP_STATE, type RepState
} from '../lib/rom'
import {
  BODY_EXERCISES, HAND_EXERCISES, type ExerciseConfig, type ExerciseMode
} from '../lib/exercises'
import ExerciseGuide from '../components/ExerciseGuide'
import SessionSamplesChart from '../components/SessionSamplesChart'
import ModelLoadingScreen from '../components/ModelLoadingScreen'

type AppState = 'select' | 'tutorial' | 'loading' | 'preview' | 'recording' | 'done'

interface SessionResult {
  maxRom: number; avgRom: number; minRom: number
  repCount: number; validFrames: number; durationSec: number
  romSamples?: number[]
}

const POSITION_HINTS: Record<string, string> = {
  elbow_flex_right:   'Pastikan bahu kanan, siku, dan pergelangan terlihat',
  elbow_flex_left:    'Pastikan bahu kiri, siku, dan pergelangan terlihat',
  shoulder_abd_right: 'Mundur agar bahu & lengan atas penuh dalam frame',
  shoulder_abd_left:  'Mundur agar bahu & lengan atas penuh dalam frame',
  knee_flex_right:    'Posisi samping — pinggul sampai tumit harus terlihat',
  knee_flex_left:     'Posisi samping — pinggul sampai tumit harus terlihat',
  ankle_dorsi_right:  'Duduk, luruskan kaki, arahkan kamera ke pergelangan',
}

const VISIBILITY_THRESHOLD = 0.45
const SAMPLE_MS = 100

export default function SessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultMode = (searchParams.get('mode') ?? 'body') as ExerciseMode
  const { currentPatient } = useAppStore()

  const [mode, setMode] = useState<ExerciseMode>(defaultMode)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null)
  const [appState, setAppState] = useState<AppState>('select')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(0)
  const [detected, setDetected] = useState(false)
  const [reps, setReps] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [facingUser, setFacingUser] = useState(true)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [audioOn, setAudioOn] = useState(isAudioEnabled)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)

  const appStateRef = useRef<AppState>('select')
  const exerciseRef = useRef<ExerciseConfig | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const lastSampleTimeRef = useRef(0)
  const repStateRef = useRef<RepState>(INITIAL_REP_STATE)
  const repsRef = useRef(0)
  const smoothAngleRef = useRef(0)
  const anglesRef = useRef<number[]>([])
  const validFramesRef = useRef(0)
  const startTimeRef = useRef<Date | null>(null)

  // Keep refs in sync on every render
  appStateRef.current = appState
  exerciseRef.current = selectedExercise

  const exercises = mode === 'body' ? BODY_EXERCISES : HAND_EXERCISES

  // ── Camera helpers ────────────────────────────────────────
  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    lastVideoTimeRef.current = -1
  }

  async function startCamera(facing: boolean): Promise<boolean> {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing ? 'user' : 'environment',
          width: { ideal: 1280 }, height: { ideal: 720 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadError(`Kamera error: ${msg}`)
      return false
    }
  }

  // ── Detection loop — stable, all reads via refs ───────────
  const detectionLoop = useCallback(() => {
    const tick = () => {
      const state = appStateRef.current
      if (state !== 'preview' && state !== 'recording') return

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (video.currentTime === lastVideoTimeRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      lastVideoTimeRef.current = video.currentTime

      const ex = exerciseRef.current
      if (!ex) { rafRef.current = requestAnimationFrame(tick); return }

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const now = performance.now()
      const [idxA, idxB, idxC] = ex.landmarks

      try {
        if (ex.mode === 'body' && poseLandmarkerRef.current) {
          const res: PoseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, now)
          drawPoseOverlay(ctx, res, ex.landmarks as unknown as number[])

          if (res.landmarks.length > 0) {
            const lms = res.landmarks[0]
            const vis = getVisibilityScore(lms, ex.landmarks as unknown as number[])
            setDetected(vis >= VISIBILITY_THRESHOLD)

            if (vis >= VISIBILITY_THRESHOLD) {
              const raw = calculateAngle(lms[idxA], lms[idxB], lms[idxC])
              smoothAngleRef.current = applyLowPassFilter(smoothAngleRef.current, raw)
              const angle = smoothAngleRef.current
              drawAngleLabel(ctx, lms[idxB], angle, canvas.width, canvas.height)
              setCurrentAngle(angle)

              if (state === 'recording' && now - lastSampleTimeRef.current >= SAMPLE_MS) {
                lastSampleTimeRef.current = now
                anglesRef.current.push(angle)
                validFramesRef.current++
                const { newState, repCompleted } = updateRepState(angle, repStateRef.current)
                repStateRef.current = newState
                if (repCompleted) { repsRef.current++; setReps(repsRef.current); announceRep(repsRef.current) }
              }
            }
          } else {
            setDetected(false)
          }

        } else if (ex.mode === 'hand' && handLandmarkerRef.current) {
          const res: HandLandmarkerResult = handLandmarkerRef.current.detectForVideo(video, now)
          drawHandOverlay(ctx, res, ex.landmarks as unknown as number[])

          if (res.landmarks.length > 0) {
            const lms = res.landmarks[0]
            setDetected(true)
            const raw = calculateAngle(lms[idxA], lms[idxB], lms[idxC])
            smoothAngleRef.current = applyLowPassFilter(smoothAngleRef.current, raw)
            const angle = smoothAngleRef.current
            drawAngleLabel(ctx, lms[idxB], angle, canvas.width, canvas.height)
            setCurrentAngle(angle)

            if (state === 'recording' && now - lastSampleTimeRef.current >= SAMPLE_MS) {
              lastSampleTimeRef.current = now
              anglesRef.current.push(angle)
              validFramesRef.current++
              const { newState, repCompleted } = updateRepState(angle, repStateRef.current)
              repStateRef.current = newState
              if (repCompleted) { repsRef.current++; setReps(repsRef.current) }
            }
          } else {
            setDetected(false)
          }
        }
      } catch { /* ignore per-frame errors */ }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // After preview/recording renders the video element, attach the camera stream.
  // startCamera() is called while the tutorial is showing (video not in DOM yet),
  // so videoRef.current is null at that point — we assign srcObject here instead.
  useEffect(() => {
    if (appState !== 'preview' && appState !== 'recording') return
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
      video.play().catch(() => {})
    }
  }, [appState])

  // Start loop only on entering 'preview'. The loop continues through 'recording'
  // automatically (reads appStateRef each tick). stopCamera() stops it explicitly.
  useEffect(() => {
    if (appState !== 'preview') return
    detectionLoop()
    // No cleanup here — the loop self-terminates when state leaves camera states,
    // and stopCamera() handles explicit cancellation.
  }, [appState, detectionLoop])

  useEffect(() => () => stopCamera(), [])

  // Warn patient via audio when pose is lost during an active recording
  useEffect(() => {
    if (appState !== 'recording' || detected) return
    const t = setTimeout(() => { if (!detected) warnNoDetection() }, 3000)
    return () => clearTimeout(t)
  }, [detected, appState])

  // ── Exercise selection → show tutorial & load model in bg ─
  async function handleExerciseSelect(exercise: ExerciseConfig) {
    setSelectedExercise(exercise)
    setLoadError(null)
    setModelLoading(true)
    setAppState('tutorial')

    // Load model in background while user reads the tutorial
    try {
      if (exercise.mode === 'body') {
        poseLandmarkerRef.current = await initPoseLandmarker()
      } else {
        handLandmarkerRef.current = await initHandLandmarker()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLoadError(`Model error: ${msg}`)
    }
    setModelLoading(false)
  }

  // ── "Mulai Latihan" from tutorial ─────────────────────────
  async function startFromTutorial() {
    if (!selectedExercise) return

    // Model might have failed or never loaded — try again
    const needsLoad = selectedExercise.mode === 'body'
      ? !poseLandmarkerRef.current
      : !handLandmarkerRef.current

    if (needsLoad || modelLoading) {
      setAppState('loading')
      try {
        if (selectedExercise.mode === 'body') {
          poseLandmarkerRef.current = await initPoseLandmarker()
        } else {
          handLandmarkerRef.current = await initHandLandmarker()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setLoadError(`Gagal memuat model: ${msg}`)
        setAppState('select')
        return
      }
    }

    const facing = selectedExercise.mode === 'body'
    setFacingUser(facing)
    const ok = await startCamera(facing)
    if (!ok) {
      setAppState('tutorial')  // camera failed — go back to tutorial
      return
    }

    // Reset tracking state for a fresh preview
    setCurrentAngle(0)
    setDetected(false)
    smoothAngleRef.current = 0
    lastVideoTimeRef.current = -1

    setAppState('preview')  // triggers useEffect → starts detection loop
  }

  function startRecording() {
    anglesRef.current = []
    validFramesRef.current = 0
    repsRef.current = 0
    repStateRef.current = INITIAL_REP_STATE
    smoothAngleRef.current = 0
    startTimeRef.current = new Date()
    resetWarnThrottle()
    setReps(0)
    setElapsedSec(0)
    setAppState('recording')  // loop keeps running — no restart needed
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000)
    announceSessionStart(selectedExercise?.nameShort)
  }

  async function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    const angles = anglesRef.current
    const ex = selectedExercise

    if (!angles.length || !ex || !currentPatient?.id) {
      announceSessionEnd(0)
      setResult({ maxRom: 0, avgRom: 0, minRom: 0, repCount: 0, validFrames: 0, durationSec: elapsedSec })
      setAppState('done')
      stopCamera()
      return
    }

    const maxRom = Math.max(...angles)
    const avgRom = angles.reduce((a, b) => a + b, 0) / angles.length
    const minRom = Math.min(...angles)
    const romSamples = angles.filter((_, i) => i % 5 === 0)
    const r: SessionResult = {
      maxRom, avgRom, minRom,
      repCount: repsRef.current,
      validFrames: validFramesRef.current,
      durationSec: elapsedSec,
      romSamples
    }
    announceSessionEnd(repsRef.current)
    setResult(r)
    setAppState('done')
    stopCamera()

    await addSession(currentPatient.id!, {
      exerciseType: ex.id,
      exerciseName: ex.name,
      jointTarget: ex.jointTarget,
      mode: ex.mode,
      startTime: startTimeRef.current!,
      endTime: new Date(),
      maxRom, avgRom, minRom,
      repCount: repsRef.current,
      validFrames: validFramesRef.current,
      durationSec: elapsedSec,
      romSamples
    })
  }

  async function flipCamera() {
    const newFacing = !facingUser
    setFacingUser(newFacing)
    await startCamera(newFacing)
  }

  function formatTime(sec: number) {
    return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`
  }

  // ── SELECT ────────────────────────────────────────────────
  if (appState === 'select') {
    return (
      <div className="page-container">
        <div className="page-header">
          <button onClick={() => navigate('/')} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <h1 className="font-bold text-lg text-slate-800">Pilih Latihan</h1>
        </div>

        {loadError && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            ⚠️ {loadError}
          </div>
        )}

        <div className="px-4 py-4">
          <div className="flex gap-2 mb-5">
            {(['body', 'hand'] as ExerciseMode[]).map(m => (
              <button
                key={m}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600'}`}
                onClick={() => setMode(m)}
              >
                {m === 'body' ? '🦾 Tubuh' : '✋ Tangan & Jari'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {exercises.map(ex => (
              <button
                key={ex.id}
                className="card w-full flex items-center gap-4 text-left active:scale-[0.99] transition-transform"
                onClick={() => handleExerciseSelect(ex)}
              >
                <div className="w-12 h-12 gradient-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{ex.mode === 'body' ? '🦾' : '✋'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{ex.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{ex.description}</p>
                  <p className="text-xs text-primary-600 font-medium mt-1">
                    ROM Normal: {ex.normalRange[0]}°–{ex.normalRange[1]}°
                  </p>
                </div>
                <ChevronLeft size={16} className="text-slate-400 rotate-180 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── TUTORIAL ──────────────────────────────────────────────
  if (appState === 'tutorial' && selectedExercise) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-white">
        <ExerciseGuide
          exercise={selectedExercise}
          loading={modelLoading}
          onStart={startFromTutorial}
          onBack={() => { setAppState('select'); setSelectedExercise(null) }}
        />
      </div>
    )
  }

  // ── LOADING ───────────────────────────────────────────────
  if (appState === 'loading') {
    return <ModelLoadingScreen />
  }

  // ── DONE ──────────────────────────────────────────────────
  if (appState === 'done' && result) {
    const pct = getRomPercentage(result.maxRom, selectedExercise?.normalRange[1] ?? 180)
    const color = getRomColor(pct)
    return (
      <div className="page-container bg-white">
        <div className="page-header">
          <button onClick={() => navigate('/')}><ChevronLeft size={24} className="text-slate-600" /></button>
          <h1 className="font-bold text-lg text-slate-800">Hasil Sesi</h1>
        </div>
        <div className="px-4 py-6 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 size={56} color={color} strokeWidth={1.5} />
            <h2 className="text-2xl font-black text-slate-800">Sesi Selesai!</h2>
            <p className="text-slate-500 text-sm">{selectedExercise?.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'ROM Maksimum', value: `${Math.round(result.maxRom)}°`, c: color },
              { label: 'ROM Rata-rata', value: `${Math.round(result.avgRom)}°`, c: '#1d4ed8' },
              { label: 'Repetisi', value: result.repCount, c: '#4f46e5' },
              { label: 'Durasi', value: formatTime(result.durationSec), c: '#0f172a' }
            ].map(({ label, value, c }) => (
              <div key={label} className="card text-center">
                <p className="text-3xl font-black" style={{ color: c }}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="card">
            <p className="text-sm font-semibold text-slate-700 mb-2">ROM vs Normal</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                <div className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }} />
              </div>
              <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Target normal: {selectedExercise?.normalRange[1]}°</p>
          </div>

          {(result.romSamples?.length ?? 0) >= 2 && (
            <div className="card">
              <p className="text-sm font-semibold text-slate-700 mb-1">ROM Selama Sesi</p>
              <p className="text-xs text-slate-400 mb-2">Kurva sudut sepanjang rekaman</p>
              <SessionSamplesChart
                samples={result.romSamples!}
                normalMax={selectedExercise?.normalRange[1]}
                height={150}
              />
            </div>
          )}
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => { setAppState('select'); setResult(null); setReps(0); setElapsedSec(0); setCurrentAngle(0); setDetected(false) }}>
              Latihan Lagi
            </button>
            <button className="btn-primary flex-1" onClick={() => navigate('/history')}>
              Lihat Progres
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PREVIEW / RECORDING ───────────────────────────────────
  const romPct = getRomPercentage(currentAngle, selectedExercise?.normalRange[1] ?? 180)
  const romColor = getRomColor(romPct)
  const posHint = selectedExercise ? (POSITION_HINTS[selectedExercise.id] ?? selectedExercise.instruction) : ''

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center"
          onClick={() => { stopCamera(); setAppState('tutorial') }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{selectedExercise?.nameShort}</p>
          {appState === 'recording' && (
            <p className="text-orange-400 text-xs font-bold animate-pulse-slow">⏱ {formatTime(elapsedSec)}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${audioOn ? 'bg-white/10' : 'bg-white/5'}`}
            onClick={() => { const v = !audioOn; setAudioOn(v); setAudioEnabled(v) }}
            title={audioOn ? 'Matikan suara' : 'Aktifkan suara'}
          >
            {audioOn
              ? <Volume2 size={18} color="white" />
              : <VolumeX size={18} color="rgba(255,255,255,0.4)" />}
          </button>
          <button
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center"
            onClick={flipCamera}
            title="Ganti kamera"
          >
            <FlipHorizontal size={18} color="white" />
          </button>
        </div>
      </div>

      {/* Camera */}
      <div className="relative flex-1 mx-3 rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: facingUser ? 'scaleX(-1)' : 'none' }}
          playsInline muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: facingUser ? 'scaleX(-1)' : 'none' }}
        />

        {/* Detection status */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${detected ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/70'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${detected ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
          {detected ? 'Terdeteksi' : 'Tidak terdeteksi'}
        </div>

        {/* Preview mode badge */}
        {appState === 'preview' && (
          <div className="absolute top-3 left-3 bg-blue-500/80 rounded-full px-3 py-1 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-white text-xs font-bold">PREVIEW</span>
          </div>
        )}

        {/* Recording badge */}
        {appState === 'recording' && (
          <div className="absolute top-3 left-3 bg-red-500 rounded-full px-3 py-1 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold">REC</span>
          </div>
        )}

        {/* Position guide — only in preview when not detected */}
        {appState === 'preview' && !detected && (
          <div className="absolute inset-x-3 bottom-3 bg-black/70 rounded-xl p-3 text-center">
            <p className="text-amber-400 text-xs font-semibold mb-0.5">📍 Atur posisi kamera</p>
            <p className="text-white/80 text-xs">{posHint}</p>
          </div>
        )}

        {/* Ready indicator */}
        {appState === 'preview' && detected && (
          <div className="absolute inset-x-3 bottom-3 bg-black/60 rounded-xl p-3 text-center">
            <p className="text-green-400 text-xs font-semibold mb-0.5">✅ Posisi bagus! Siap mulai.</p>
            <p className="text-white/80 text-xs">{selectedExercise?.instruction}</p>
          </div>
        )}
      </div>

      {/* ROM display */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-white/60 text-xs mb-1">ROM Sekarang</p>
            <p className="text-4xl font-black" style={{ color: detected ? romColor : '#64748b' }}>
              {detected ? `${Math.round(currentAngle)}°` : '--°'}
            </p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/60 text-xs">vs Normal ({selectedExercise?.normalRange[1]}°)</p>
              {detected && <p className="text-xs font-bold" style={{ color: romColor }}>{romPct}%</p>}
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${detected ? Math.min(100, romPct) : 0}%`, backgroundColor: romColor }}
              />
            </div>
            {appState === 'recording' && (
              <p className="text-white/50 text-xs mt-1.5">{reps} rep · {validFramesRef.current} frame valid</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-20">
        {appState === 'preview' && (
          <button
            className="w-full py-4 bg-primary-600 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3"
            onClick={startRecording}
          >
            <Play size={22} fill="white" /> Mulai Rekam
          </button>
        )}
        {appState === 'recording' && (
          <button
            className="w-full py-4 bg-red-500 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3"
            onClick={stopRecording}
          >
            <Square size={22} fill="white" /> Selesai
          </button>
        )}
      </div>
    </div>
  )
}
