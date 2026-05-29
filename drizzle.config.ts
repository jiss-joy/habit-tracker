import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/db/schemas/*', './src/db/enums/*'],
  out: './src/db/migrations',
  casing: 'snake_case',
  migrations: {
    prefix: 'timestamp',
  },
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
