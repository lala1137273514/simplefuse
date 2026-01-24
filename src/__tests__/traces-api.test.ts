/**
 * Trace API 测试 - TDD RED 阶段
 * 
 * 测试 /api/v1/traces POST 端点
 * 这些测试应该先失败，然后我们实现代码让它们通过
 */

import { describe, it, expect } from 'vitest'

// 导入 API 处理函数
import { POST } from '../app/api/v1/traces/route'

describe('POST /api/v1/traces', () => {
  describe('接收有效的 Trace 数据', () => {
    it('应该成功接收并返回 201 状态码', async () => {
      const traceData = {
        id: 'trace-123',
        projectId: 'project-abc',
        name: '测试对话',
        timestamp: new Date().toISOString(),
        input: JSON.stringify({ message: '你好' }),
        output: JSON.stringify({ response: '你好！有什么可以帮您？' }),
        metadata: {},
        tags: ['test'],
      }

      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify(traceData),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.traceId).toBe('trace-123')
    })

    it('应该支持批量发送多个 Traces', async () => {
      const traces = [
        {
          id: 'trace-001',
          projectId: 'project-abc',
          name: '对话1',
          timestamp: new Date().toISOString(),
          input: '{}',
          output: '{}',
        },
        {
          id: 'trace-002',
          projectId: 'project-abc',
          name: '对话2',
          timestamp: new Date().toISOString(),
          input: '{}',
          output: '{}',
        },
      ]

      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify({ traces }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.count).toBe(2)
    })
  })

  describe('数据验证', () => {
    it('缺少必填字段时应该返回 400 错误', async () => {
      const invalidData = {
        // 缺少 projectId 和其他必填字段
        name: '测试',
      }

      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('无效的 JSON 格式应该返回 400 错误', async () => {
      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
        body: 'invalid json {{{',
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('认证验证', () => {
    it('缺少 API Key 时应该返回 401 错误', async () => {
      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 没有 X-API-Key
        },
        body: JSON.stringify({ id: 'test' }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })

    it('无效的 API Key 应该返回 401 错误', async () => {
      const request = new Request('http://localhost:3000/api/v1/traces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'invalid-key',
        },
        body: JSON.stringify({ id: 'test' }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(401)
    })
  })
})
