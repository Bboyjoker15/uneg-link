import { config } from 'dotenv'
config()

export default {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'uneg-link-secret-key-2026',
  groqApiKey: process.env.GROQ_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uneglink',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@uneglink.com'
  },
  baseUrl: process.env.BASE_URL || 'http://localhost:5173'
}
