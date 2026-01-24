/**
 * tRPC 初始化
 * 创建 tRPC 实例和中间件
 */

import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

/**
 * 上下文类型
 * 可以包含数据库连接、用户信息等
 */
export interface Context {
  // TODO: 添加数据库连接
}

/**
 * 创建上下文
 */
export const createContext = async (): Promise<Context> => {
  return {}
}

/**
 * tRPC 实例
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

/**
 * 导出 router 和 procedure
 */
export const router = t.router
export const publicProcedure = t.procedure
export const middleware = t.middleware
