import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import marketRouter from './routes/market'
import portfolioRouter from './routes/portfolio'

dotenv.config()

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
