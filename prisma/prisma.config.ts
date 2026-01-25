import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  migrate: {
    async datasourceUrl() {
      return process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simplefuse'
    }
  }
})
