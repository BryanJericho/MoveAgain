import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Patient } from '../lib/db'

interface AppState {
  currentPatient: Patient | null
  setCurrentPatient: (patient: Patient | null) => void
  updatePatient: (updates: Partial<Patient>) => void
  apiKeyConfigured: boolean
  setApiKeyConfigured: (val: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentPatient: null,
      apiKeyConfigured: false,

      setCurrentPatient: (patient) => set({ currentPatient: patient }),

      updatePatient: (updates) =>
        set(state => ({
          currentPatient: state.currentPatient
            ? { ...state.currentPatient, ...updates }
            : null
        })),

      setApiKeyConfigured: (val) => set({ apiKeyConfigured: val })
    }),
    {
      name: 'move-again-store',
      partialize: (state) => ({
        apiKeyConfigured: state.apiKeyConfigured
        // currentPatient is NOT persisted — always loaded fresh from Firestore on auth
      })
    }
  )
)
