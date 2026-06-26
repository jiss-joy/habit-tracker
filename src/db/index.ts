'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })

const getDatabase = () => drizzle({
  client,
  casing: 'snake_case',
  logger: process.env.DRIZZLE_LOGGER === 'true',
})

export const db = getDatabase()