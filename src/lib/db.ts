import {
  doc, collection, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, getDocs, writeBatch, Timestamp
} from 'firebase/firestore'
import { firestore } from './firebase'

// ── Types ──────────────────────────────────────────────────
export interface Patient {
  id?: string           // Firebase UID
  name: string
  age: number
  gender: 'male' | 'female'
  affectedSide: 'left' | 'right' | 'both'
  email: string
  createdAt: Date
  strokeType?: 'Hemoragik' | 'Iskemik'
  strokeOnsetDate?: Date
}

export interface Session {
  id?: string           // Firestore document ID
  userId: string        // Firebase UID
  exerciseType: string
  exerciseName: string
  jointTarget: string
  mode: 'body' | 'hand'
  startTime: Date
  endTime: Date
  maxRom: number
  avgRom: number
  minRom: number
  repCount: number
  validFrames: number
  durationSec: number
  romSamples?: number[]
}

export interface ChatMessage {
  id?: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ── Timestamp helpers ──────────────────────────────────────
function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate()
  if (val instanceof Date) return val
  return new Date(val as string)
}

function fromDate(d: Date) {
  return Timestamp.fromDate(d)
}

// ── Patient / Profile ──────────────────────────────────────
export async function savePatientProfile(uid: string, data: Omit<Patient, 'id'>): Promise<void> {
  const { strokeOnsetDate, ...rest } = data
  await setDoc(doc(firestore, 'users', uid), {
    ...rest,
    createdAt: fromDate(data.createdAt),
    ...(strokeOnsetDate ? { strokeOnsetDate: fromDate(strokeOnsetDate) } : {})
  })
}

export async function getPatientProfile(uid: string): Promise<Patient | null> {
  const snap = await getDoc(doc(firestore, 'users', uid))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: uid,
    ...d,
    createdAt: toDate(d.createdAt),
    ...(d.strokeOnsetDate ? { strokeOnsetDate: toDate(d.strokeOnsetDate) } : {})
  } as Patient
}

export async function updatePatientProfile(uid: string, updates: Partial<Omit<Patient, 'id'>>): Promise<void> {
  const { strokeOnsetDate, ...rest } = updates
  await updateDoc(doc(firestore, 'users', uid), {
    ...rest,
    ...(strokeOnsetDate ? { strokeOnsetDate: fromDate(strokeOnsetDate) } : {})
  })
}

// ── Sessions ───────────────────────────────────────────────
export async function addSession(userId: string, data: Omit<Session, 'id' | 'userId'>): Promise<string> {
  const ref = await addDoc(collection(firestore, 'users', userId, 'sessions'), {
    userId,
    ...data,
    startTime: fromDate(data.startTime),
    endTime: fromDate(data.endTime)
  })
  return ref.id
}

export async function getRecentSessions(userId: string, limitCount = 50): Promise<Session[]> {
  const q = query(
    collection(firestore, 'users', userId, 'sessions'),
    orderBy('startTime', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      startTime: toDate(data.startTime),
      endTime: toDate(data.endTime)
    } as Session
  })
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'users', userId, 'sessions', sessionId))
}

// ── Chat messages ──────────────────────────────────────────
export async function addChatMessage(userId: string, msg: Omit<ChatMessage, 'id' | 'userId'>): Promise<void> {
  await addDoc(collection(firestore, 'users', userId, 'chatMessages'), {
    userId,
    ...msg,
    timestamp: fromDate(msg.timestamp)
  })
}

export async function getChatHistory(userId: string, limitCount = 50): Promise<ChatMessage[]> {
  const q = query(
    collection(firestore, 'users', userId, 'chatMessages'),
    orderBy('timestamp', 'asc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return { id: d.id, ...data, timestamp: toDate(data.timestamp) } as ChatMessage
  })
}

// ── Wipe all user data (used on account delete / clear data) ─
export async function clearUserData(userId: string): Promise<void> {
  const sessionsSnap = await getDocs(collection(firestore, 'users', userId, 'sessions'))
  const chatsSnap = await getDocs(collection(firestore, 'users', userId, 'chatMessages'))

  // Firestore batch limit is 500 — chunk if needed
  const allDeletes = [
    ...sessionsSnap.docs.map(d => d.ref),
    ...chatsSnap.docs.map(d => d.ref),
    doc(firestore, 'users', userId)
  ]

  const CHUNK = 490
  for (let i = 0; i < allDeletes.length; i += CHUNK) {
    const batch = writeBatch(firestore)
    allDeletes.slice(i, i + CHUNK).forEach(ref => batch.delete(ref))
    await batch.commit()
  }
}
