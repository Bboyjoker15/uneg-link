import nodemailer from 'nodemailer'
import config from '../config.js'

let transporter = null

function getTransporter() {
  if (!transporter) {
    if (config.smtp.user && config.smtp.pass) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: { user: config.smtp.user, pass: config.smtp.pass }
      })
    }
  }
  return transporter
}

export async function sendPasswordResetEmail(email, nombre, token) {
  const resetUrl = `${config.baseUrl}/reset-password?token=${token}`

  const smtp = getTransporter()
  if (smtp) {
    try {
      await smtp.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Recuperación de contraseña - Uneg-Link',
        html: `
          <h2>Hola ${nombre},</h2>
          <p>Has solicitado recuperar tu contraseña en Uneg-Link.</p>
          <p>Haz clic en el siguiente enlace para restablecerla:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Este enlace expira en 1 hora.</p>
          <p>Si no solicitaste esto, ignora este mensaje.</p>
        `
      })
    } catch (err) {
      console.warn('Email sending failed (SMTP not configured?):', err.message)
    }
  }

  console.log(`\n📧 [DEV] Password reset token for ${nombre} (${email}): ${token}\n`)
  console.log(`📧 [DEV] Reset URL: ${resetUrl}\n`)

  return token
}
