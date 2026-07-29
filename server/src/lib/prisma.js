import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import config from '../config.js'

const libsql = createClient({
  url: config.tursoUrl,
  authToken: config.tursoToken
})

const prisma = new PrismaClient({
  adapter: new PrismaLibSQL(libsql)
})

export default prisma
