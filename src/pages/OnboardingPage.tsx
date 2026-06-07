import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { savePatientProfile, getPatientProfile } from '../lib/db'
import { auth } from '../lib/firebase'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male' as 'male' | 'female',
    affectedSide: 'right' as 'left' | 'right' | 'both'
  })
  const [saving, setSaving] = useState(false)
  const { setCurrentPatient } = useAppStore()

  async function handleSubmit() {
    const uid = auth.currentUser?.uid
    const email = auth.currentUser?.email ?? ''
    if (!form.name || !form.age || !uid) return
    setSaving(true)
    await savePatientProfile(uid, {
      name: form.name.trim(),
      age: parseInt(form.age),
      gender: form.gender,
      affectedSide: form.affectedSide,
      email,
      createdAt: new Date()
    })
    const profile = await getPatientProfile(uid)
    if (profile) setCurrentPatient(profile)
    setSaving(false)
  }

  // ── Welcome screen ────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6 bg-white">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <img src="/icons/icon.svg" alt="Move Again" className="w-28 h-28 rounded-3xl shadow-xl" />
          <div>
            <h1 className="text-3xl font-black text-primary-900">Move Again</h1>
            <p className="text-slate-500 mt-1 font-medium">Setiap Gerakan, Selangkah Pemulihan</p>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Aplikasi pemantauan pemulihan pasca-stroke berbasis <em>computer vision</em>.
            Lacak Range of Motion (ROM) Anda setiap hari tanpa alat tambahan.
          </p>
          <div className="w-full space-y-3">
            {[
              ['📷', 'Deteksi Otomatis', 'MediaPipe AI tracking real-time'],
              ['📊', 'Pantau Progres', 'Grafik ROM tersimpan di cloud'],
              ['🤖', 'Konsultasi AI', 'Tanya jawab berbasis data Anda'],
            ].map(([icon, title, sub]) => (
              <div key={title} className="flex items-center gap-3 bg-primary-50 rounded-xl p-3">
                <span className="text-2xl">{icon}</span>
                <div className="text-left">
                  <p className="font-semibold text-sm text-primary-800">{title}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
            onClick={() => setStep(1)}
          >
            Lengkapi Profil <ChevronRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  // ── Profile form ──────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen p-6 bg-white">
      <div className="flex flex-col gap-2 mb-8 mt-8">
        <h2 className="text-2xl font-bold text-primary-900">Profil Pasien</h2>
        <p className="text-slate-500 text-sm">Isi data ini untuk personalisasi program latihan Anda</p>
      </div>

      <div className="flex flex-col gap-5 flex-1">
        <div>
          <label className="label">Nama Lengkap *</label>
          <input
            className="input-field"
            placeholder="Masukkan nama Anda"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div>
          <label className="label">Usia *</label>
          <input
            className="input-field"
            type="number"
            min={1}
            max={120}
            placeholder="Contoh: 65"
            value={form.age}
            onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
          />
        </div>

        <div>
          <label className="label">Jenis Kelamin</label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as const).map(g => (
              <button
                key={g}
                className={`py-3 rounded-xl border-2 font-medium transition-colors ${
                  form.gender === g
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600'
                }`}
                onClick={() => setForm(f => ({ ...f, gender: g }))}
              >
                {g === 'male' ? '♂ Laki-laki' : '♀ Perempuan'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Sisi Tubuh yang Terdampak</label>
          <div className="grid grid-cols-3 gap-2">
            {([['left', 'Kiri'], ['right', 'Kanan'], ['both', 'Keduanya']] as const).map(([val, lbl]) => (
              <button
                key={val}
                className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  form.affectedSide === val
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600'
                }`}
                onClick={() => setForm(f => ({ ...f, affectedSide: val }))}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="btn-primary w-full mt-8 flex items-center justify-center gap-2 text-base"
        disabled={!form.name || !form.age || saving}
        onClick={handleSubmit}
      >
        {saving
          ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <>Simpan & Mulai <ChevronRight size={20} /></>}
      </button>
    </div>
  )
}
