import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'

config()

const app = express()
const port = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json())

// Chatbot now calls Gemini directly from the frontend.
// This server is kept for potential future backend needs.

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(port, () => {
  console.log(`Move Again server running on http://localhost:${port}`)
})
