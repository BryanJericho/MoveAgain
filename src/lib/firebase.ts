import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

// True when all required env vars are present
export const firebaseReady = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
)

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _firestore: Firestore | null = null

if (firebaseReady) {
  try {
    _app = initializeApp(firebaseConfig)
    _auth = getAuth(_app)
    _firestore = getFirestore(_app)
  } catch (err) {
    console.error('Firebase init error:', err)
  }
}

// These are safe to use only when firebaseReady === true
export const auth = _auth as Auth
export const firestore = _firestore as Firestore
