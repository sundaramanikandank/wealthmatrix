import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import marketRouter from './routes/market'
import portfolioRouter from './routes/portfolio'
import wealthRouter from './routes/wealth'
import { supabase } from './lib/supabase'

const app = express()
const PORT = process.env.PORT ?? 4000

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`))
      }
    },
    credentials: true,
  }),
)

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() })
})

app.use('/api/market', marketRouter)
app.use('/api/portfolio', portfolioRouter)
app.use('/api/wealth', wealthRouter)

async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from('strategies')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
    } else {
      console.log('✅ Supabase connected successfully')
    }
  } catch (err) {
    console.error('❌ Supabase init error:', err)
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  checkDatabaseConnection()
})
