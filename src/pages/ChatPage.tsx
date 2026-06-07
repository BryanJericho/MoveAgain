import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getRecentSessions, type Session } from '../lib/db'
import { sendChatMessage, QUICK_QUESTIONS, type ChatMsg, type PatientContext } from '../lib/chatbot'
import { getExerciseById } from '../lib/exercises'

interface LocalMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  loading?: boolean
}

async function buildPatientContext(userId: string, patientName: string, affectedSide: string): Promise<PatientContext> {
  const sessions = await getRecentSessions(userId, 100)

  const recent = sessions.slice(0, 7).map((s: Session) => ({
    date: new Date(s.startTime).toLocaleDateString('id-ID'),
    exerciseName: getExerciseById(s.exerciseType)?.name ?? s.exerciseType,
    maxRom: Math.round(s.maxRom),
    avgRom: Math.round(s.avgRom),
    reps: s.repCount
  }))

  const bestRom: Record<string, number> = {}
  for (const s of sessions) {
    if (!bestRom[s.exerciseType] || s.maxRom > bestRom[s.exerciseType]) {
      bestRom[s.exerciseType] = Math.round(s.maxRom)
    }
  }

  const days = new Set(sessions.map((s: Session) => new Date(s.startTime).toDateString()))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (days.has(d.toDateString())) streak++
    else break
  }

  return { name: patientName, affectedSide, recentSessions: recent, bestRomByExercise: bestRom, totalSessions: sessions.length, streakDays: streak }
}

export default function ChatPage() {
  const { currentPatient } = useAppStore()
  const [messages, setMessages] = useState<LocalMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [apiError, setApiError] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fresh welcome message every time user arrives at this page
  useEffect(() => {
    if (!currentPatient) return
    setMessages([{
      role: 'assistant',
      content: `Halo ${currentPatient.name}! 👋 Saya asisten konsultasi Move Again. Saya siap membantu menjawab pertanyaan seputar pemulihan Anda.\n\nApa yang ingin Anda tanyakan?`,
      timestamp: new Date()
    }])
  }, [currentPatient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || sending || !currentPatient?.id) return
    setInput('')
    setSending(true)
    setApiError(false)

    // Use in-memory messages as context for the AI (no Firestore)
    const currentMsgs = messages.filter(m => !m.loading)
    const apiMsgs: ChatMsg[] = currentMsgs.map(m => ({ role: m.role, content: m.content }))
    apiMsgs.push({ role: 'user', content: text.trim() })

    setMessages(prev => [
      ...prev,
      { role: 'user', content: text.trim(), timestamp: new Date() },
      { role: 'assistant', content: '', timestamp: new Date(), loading: true }
    ])

    try {
      const context = await buildPatientContext(currentPatient.id, currentPatient.name, currentPatient.affectedSide)
      const reply = await sendChatMessage(apiMsgs, context)

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: reply, timestamp: new Date() }
      ])
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('Chat error:', detail)
      setApiError(true)
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `⚠️ Error: ${detail}`, timestamp: new Date() }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-header flex-shrink-0">
        <div className="w-9 h-9 gradient-blue rounded-xl flex items-center justify-center">
          <Bot size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-base text-slate-800">Konsultasi AI</h1>
          <p className="text-xs text-green-500 font-medium">● Online</p>
        </div>
      </div>

      {apiError && (
        <div className="mx-4 mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex-shrink-0">
          <p className="text-xs text-amber-700">
            <strong>Gagal terhubung ke AI.</strong> Pastikan{' '}
            <code className="bg-amber-100 px-1 rounded">VITE_GEMINI_API_KEY</code> sudah diisi di{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> dan valid.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user' ? 'bg-primary-600' : 'bg-slate-100'
            }`}>
              {msg.role === 'user'
                ? <User size={14} color="white" />
                : <Bot size={14} className="text-primary-600" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-tr-md'
                : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-md'
            }`}>
              {msg.loading
                ? <Loader2 size={16} className="animate-spin text-slate-400" />
                : <p className="whitespace-pre-wrap">{msg.content}</p>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-xs text-slate-400 mb-2">Pertanyaan umum:</p>
          <div className="flex flex-col gap-1.5">
            {QUICK_QUESTIONS.slice(0, 3).map(q => (
              <button
                key={q}
                className="text-left text-xs bg-primary-50 text-primary-700 rounded-xl px-3 py-2 hover:bg-primary-100 transition-colors"
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-20 pt-2 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-white">
        <input
          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          placeholder="Ketik pertanyaan Anda..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          disabled={sending}
        />
        <button
          className="w-12 h-12 gradient-blue rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <Loader2 size={18} color="white" className="animate-spin" />
            : <Send size={18} color="white" />}
        </button>
      </div>
    </div>
  )
}
