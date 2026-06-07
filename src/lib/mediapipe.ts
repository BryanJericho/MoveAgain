import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
  DrawingUtils,
  type PoseLandmarkerResult,
  type HandLandmarkerResult,
  type NormalizedLandmark
} from '@mediapipe/tasks-vision'

export type { NormalizedLandmark, PoseLandmarkerResult, HandLandmarkerResult }

const WASM_PATH = '/mediapipe-wasm'
const POSE_MODEL = '/models/pose_landmarker_lite.task'
const HAND_MODEL = '/models/hand_landmarker.task'

// Promise-based singletons — prevents double-init race condition
let _visionPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null
let _posePromise: Promise<PoseLandmarker> | null = null
let _handPromise: Promise<HandLandmarker> | null = null

function getVision() {
  if (!_visionPromise) {
    _visionPromise = FilesetResolver.forVisionTasks(WASM_PATH)
  }
  return _visionPromise
}

export function initPoseLandmarker(): Promise<PoseLandmarker> {
  if (!_posePromise) {
    _posePromise = getVision().then(vision =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: POSE_MODEL,
          delegate: 'CPU'   // GPU can hang on some devices; CPU is reliable
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
    ).catch(err => {
      _posePromise = null   // allow retry on failure
      throw err
    })
  }
  return _posePromise
}

export function initHandLandmarker(): Promise<HandLandmarker> {
  if (!_handPromise) {
    _handPromise = getVision().then(vision =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL,
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
    ).catch(err => {
      _handPromise = null
      throw err
    })
  }
  return _handPromise
}

export function drawPoseOverlay(
  ctx: CanvasRenderingContext2D,
  result: PoseLandmarkerResult,
  highlightIndices?: number[]
) {
  const drawUtils = new DrawingUtils(ctx)
  for (const landmarks of result.landmarks) {
    drawUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
      color: 'rgba(59,130,246,0.6)',
      lineWidth: 2
    })
    drawUtils.drawLandmarks(landmarks, {
      color: '#fff',
      fillColor: 'rgba(59,130,246,0.8)',
      lineWidth: 1,
      radius: 4
    })
    if (highlightIndices) {
      const highlighted = highlightIndices.map(i => landmarks[i]).filter(Boolean)
      drawUtils.drawLandmarks(highlighted, {
        color: '#fff',
        fillColor: '#f59e0b',
        lineWidth: 2,
        radius: 7
      })
    }
  }
}

export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  result: HandLandmarkerResult,
  highlightIndices?: number[]
) {
  const drawUtils = new DrawingUtils(ctx)
  for (const landmarks of result.landmarks) {
    drawUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
      color: 'rgba(59,130,246,0.6)',
      lineWidth: 2
    })
    drawUtils.drawLandmarks(landmarks, {
      color: '#fff',
      fillColor: 'rgba(59,130,246,0.8)',
      lineWidth: 1,
      radius: 5
    })
    if (highlightIndices) {
      const highlighted = highlightIndices.map(i => landmarks[i]).filter(Boolean)
      drawUtils.drawLandmarks(highlighted, {
        color: '#fff',
        fillColor: '#f59e0b',
        lineWidth: 2,
        radius: 8
      })
    }
  }
}

export function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  landmark: NormalizedLandmark,
  angle: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const x = landmark.x * canvasWidth
  const y = landmark.y * canvasHeight

  ctx.save()
  ctx.fillStyle = 'rgba(30,58,138,0.90)'
  ctx.beginPath()
  ctx.roundRect(x - 32, y - 38, 68, 30, 8)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 17px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${Math.round(angle)}°`, x + 2, y - 18)
  ctx.restore()
}
