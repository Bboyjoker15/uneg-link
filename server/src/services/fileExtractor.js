import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
const UPLOADS_DIR = path.join(import.meta.dirname, '../../uploads')

export async function extractTextFromFile(fileUrl, mimeType) {
  const filePath = path.join(UPLOADS_DIR, path.basename(fileUrl))

  try {
    if (!fs.existsSync(filePath)) return null

    if (mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf-8').slice(0, 5000)
    }

    if (mimeType === 'application/pdf') {
      const data = fs.readFileSync(filePath)
      const parsed = await pdfParse(data)
      return parsed.text.slice(0, 5000)
    }

    return null
  } catch (e) {
    console.error(`Error extracting text from ${fileUrl}:`, e.message)
    return null
  }
}
