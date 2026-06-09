import { useState } from 'react'
import { Settings, User, Key, Trash2, Save, AlertTriangle, LogOut, Volume2 } from 'lucide-react'
import { isAudioEnabled, setAudioEnabled } from '../lib/audio'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAppStore } from '../store/useAppStore'
import { updatePatientProfile, clearUserData } from '../lib/db'

export default function SettingsPage() {
  const { currentPatient, setCurrentPatient, updatePatient, apiKeyConfigured, setApiKeyConfigured } = useAppStore()
  const [editingProfile, setEditingProfile] = useState(false)
  const [form, setForm] = useState({
    name: currentPatient?.name ?? '',
    age: String(currentPatient?.age ?? ''),
    gender: (currentPatient?.gender ?? 'male') as 'male' | 'female',
    affectedSide: (currentPatient?.affectedSide ?? 'right') as 'left' | 'right' | 'both',
    strokeType: (currentPatient?.strokeType ?? 'Iskemik') as 'Hemoragik' | 'Iskemik',
    strokeOnsetDate: currentPatient?.strokeOnsetDate
      ? new Date(currentPatient.strokeOnsetDate).toISOString().split('T')[0]
      : ''
  })
  const [audioOn, setAudioOn] = useState(isAudioEnabled)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkingApi, setCheckingApi] = useState(false)

  async function saveProfile() {
    if (!form.name || !form.age || !currentPatient?.id) return
    setSaving(true)
    const [y, m, d] = form.strokeOnsetDate ? form.strokeOnsetDate.split('-').map(Number) : []
    const updates = {
      name: form.name.trim(),
      age: parseInt(form.age),
      gender: form.gender,
      affectedSide: form.affectedSide,
      strokeType: form.strokeType,
      ...(form.strokeOnsetDate ? { strokeOnsetDate: new Date(y, m - 1, d) } : {})
    }
    await updatePatientProfile(currentPatient.id, updates)
    updatePatient(updates)
    setSaving(false)
    setSaved(true)
    setEditingProfile(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function checkApiConnection() {
    setCheckingApi(true)
    try {
      const res = await fetch('/api/health')
      setApiKeyConfigured(res.ok)
    } catch {
      setApiKeyConfigured(false)
    }
    setCheckingApi(false)
  }

  async function handleLogout() {
    await signOut(auth)
    setCurrentPatient(null)
  }

  async function handleClearData() {
    if (!currentPatient?.id) return
    await clearUserData(currentPatient.id)
    await signOut(auth)
    setCurrentPatient(null)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Settings size={22} className="text-primary-700" />
        <h1 className="font-bold text-lg text-slate-800 flex-1">Pengaturan</h1>
        <button
          className="flex items-center gap-1.5 text-slate-500 text-sm font-medium px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
          onClick={handleLogout}
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            ✅ Profil berhasil disimpan
          </div>
        )}

        {/* Account info */}
        <div className="card bg-primary-50/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-blue rounded-2xl flex items-center justify-center">
              <User size={22} color="white" />
            </div>
            <div>
              <p className="font-bold text-slate-800">{currentPatient?.name}</p>
              <p className="text-xs text-slate-500">{currentPatient?.email}</p>
            </div>
          </div>
        </div>

        {/* Profile section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-primary-600" />
              <h2 className="font-semibold text-slate-700">Profil Pasien</h2>
            </div>
            <button
              className="text-primary-600 text-sm font-semibold"
              onClick={() => setEditingProfile(!editingProfile)}
            >
              {editingProfile ? 'Batal' : 'Edit'}
            </button>
          </div>

          {!editingProfile ? (
            <div className="space-y-2">
              {[
                ['Nama', currentPatient?.name],
                ['Usia', `${currentPatient?.age} tahun`],
                ['Jenis Kelamin', currentPatient?.gender === 'male' ? 'Laki-laki' : 'Perempuan'],
                ['Sisi Terdampak', { left: 'Kiri', right: 'Kanan', both: 'Keduanya' }[currentPatient?.affectedSide ?? 'right']],
                ['Jenis Stroke', currentPatient?.strokeType ?? '-'],
                ['Onset Stroke', currentPatient?.strokeOnsetDate
                  ? new Date(currentPatient.strokeOnsetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '-']
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Nama</label>
                <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Usia</label>
                <input className="input-field" type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div>
                <label className="label">Jenis Kelamin</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as const).map(g => (
                    <button key={g} className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.gender === g ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`} onClick={() => setForm(f => ({ ...f, gender: g }))}>
                      {g === 'male' ? '♂ Laki-laki' : '♀ Perempuan'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Sisi Terdampak</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'right', 'both'] as const).map(s => (
                    <button key={s} className={`py-2.5 rounded-xl border-2 text-xs font-medium transition-colors ${form.affectedSide === s ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`} onClick={() => setForm(f => ({ ...f, affectedSide: s }))}>
                      {s === 'left' ? 'Kiri' : s === 'right' ? 'Kanan' : 'Keduanya'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Jenis Stroke</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Iskemik', 'Hemoragik'] as const).map(t => (
                    <button key={t} className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${form.strokeType === t ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`} onClick={() => setForm(f => ({ ...f, strokeType: t }))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Tanggal Onset Stroke</label>
                <input
                  className="input-field"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.strokeOnsetDate}
                  onChange={e => setForm(f => ({ ...f, strokeOnsetDate: e.target.value }))}
                />
              </div>
              <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={saveProfile} disabled={saving}>
                <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          )}
        </div>

        {/* Audio settings */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={18} className="text-primary-600" />
              <div>
                <h2 className="font-semibold text-slate-700">Panduan Suara</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hitung repetisi & motivasi saat latihan
                </p>
              </div>
            </div>
            <button
              onClick={() => { const v = !audioOn; setAudioOn(v); setAudioEnabled(v) }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${audioOn ? 'bg-primary-600' : 'bg-slate-200'}`}
              aria-label={audioOn ? 'Nonaktifkan suara' : 'Aktifkan suara'}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${audioOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {audioOn && (
            <div className="mt-3 bg-primary-50 rounded-xl p-3 text-xs text-primary-700 space-y-1 leading-relaxed">
              <p>🔢 Menghitung rep dengan suara: "Satu", "Dua"…</p>
              <p>🎉 Dorongan setiap 5 rep: "Lima! Bagus sekali."</p>
              <p>📷 Peringatan bila pose tidak terdeteksi</p>
              <p>✅ "Latihan selesai. X repetisi. Kerja bagus!"</p>
            </div>
          )}
        </div>

        {/* API / Server status */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Key size={18} className="text-primary-600" />
            <h2 className="font-semibold text-slate-700">Chatbot AI</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Chatbot membutuhkan server backend. Jalankan{' '}
            <code className="bg-slate-100 px-1 rounded font-mono">npm run server</code> setelah mengatur{' '}
            <code className="bg-slate-100 px-1 rounded font-mono">ANTHROPIC_API_KEY</code> di file{' '}
            <code className="bg-slate-100 px-1 rounded font-mono">.env.local</code>.
          </p>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${apiKeyConfigured ? 'text-green-600' : 'text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${apiKeyConfigured ? 'bg-green-500' : 'bg-red-400'}`} />
              {apiKeyConfigured ? 'Server aktif' : 'Server tidak aktif'}
            </div>
            <button
              className="ml-auto text-xs text-primary-600 font-semibold bg-primary-50 px-3 py-1.5 rounded-xl"
              onClick={checkApiConnection}
              disabled={checkingApi}
            >
              {checkingApi ? 'Memeriksa...' : 'Cek Koneksi'}
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Tentang Aplikasi</h2>
          <div className="space-y-2 text-sm">
            {[
              ['Versi', '1.0.0'],
              ['Database', 'Firebase Firestore'],
              ['Auth', 'Firebase Authentication'],
              ['Pose Engine', 'MediaPipe Tasks Vision'],
              ['AI Chatbot', 'Claude (Anthropic)'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="card border-red-100 bg-red-50/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-semibold text-red-700">Hapus Semua Data</h2>
          </div>
          <p className="text-xs text-red-500 mb-3">
            Tindakan ini akan menghapus semua data latihan, riwayat sesi, dan profil dari server. Tidak dapat dibatalkan.
          </p>
          {!confirmDelete ? (
            <button className="btn-danger w-full flex items-center justify-center gap-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} /> Hapus Semua Data
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600" onClick={() => setConfirmDelete(false)}>
                Batal
              </button>
              <button className="flex-1 py-2.5 bg-red-500 rounded-xl text-white text-sm font-semibold" onClick={handleClearData}>
                Ya, Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
