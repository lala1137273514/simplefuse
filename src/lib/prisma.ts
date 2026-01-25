/**
 * Prisma 客户端单例
 * 
 * Prisma 7 需要使用 driver adapter 模式
 * 使用 @prisma/adapter-pg 进行 PostgreSQL 连接
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 数据库连接字符串
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simplefuse'

// 创建 PostgreSQL adapter
const adapter = new PrismaPg({ connectionString })

// 使用 adapter 创建 Prisma Client
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
