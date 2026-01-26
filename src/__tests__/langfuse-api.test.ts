
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../app/api/public/ingestion/route'
// ClickHouse mock setup happens via vi.mock

// Mock ClickHouse
vi.mock('../lib/clickhouse', () => ({
  insertTrace: vi.fn(),
  insertTraces: vi.fn(),
  insertScore: vi.fn(),
  getClickHouseClient: vi.fn(),
}))

describe('Langfuse Ingestion API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept trace-create event and return success', async () => {
    // Mock Auth Header (Basic Auth: public_key:secret_key)
    const publicKey = 'pk-123456'
    const secretKey = 'sk-abcdef'
    const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64')

    const payload = {
      batch: [
        {
          id: 'trace-1',
          type: 'trace-create',
          timestamp: new Date().toISOString(),
          body: {
            name: 'my-workflow',
            userId: 'user-1',
            metadata: { key: 'value' },
            input: { query: 'hello' },
          }
        }
      ]
    }

    const request = new Request('http://localhost:3000/api/public/ingestion', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    
    // RED: This should fail initially (501 Not Implemented)
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data.successes).toHaveLength(1)
  })

  it('should process generation-create event as LLM call', async () => {
    const publicKey = 'pk-123456'
    const secretKey = 'sk-abcdef'
    const authHeader = 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64')

    const payload = {
      batch: [
        {
          id: 'gen-1',
          traceId: 'trace-1',
          type: 'generation-create',
          timestamp: new Date().toISOString(),
          body: {
            name: 'gpt-4',
            model: 'gpt-4',
            input: [{ role: 'user', content: 'hello' }],
            output: { completion: 'world' },
            usage: { totalTokens: 50 },
          }
        }
      ]
    }

    const request = new Request('http://localhost:3000/api/public/ingestion', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
