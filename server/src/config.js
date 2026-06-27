import { config } from 'dotenv'
config()

export default {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'uneg-link-secret-key-2026',
  groqApiKey: process.env.GROQ_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uneglink'
}
