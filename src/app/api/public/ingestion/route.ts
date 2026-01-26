import { NextResponse } from 'next/server'
import { insertTraces, type TraceData } from '@/lib/clickhouse'

// Langfuse Event Types
interface LangfuseBody {
  name?: string
  model?: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
  usage?: {
    totalTokens?: number
  }
}

interface LangfuseEvent {
  id: string
  type: string
  timestamp: string
  body?: LangfuseBody
}

// Basic Auth Validation
async function validateAuth(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [publicKey] = credentials.split(':')

    // Find project by matching keys
    // FIXME: In production, verify against DB. For now, we mock success or simple check
    // Assuming publicKey is related to project somehow.
    // Dify usually sends pk-..., sk-...
   
    // For MVP/Demo: accept any key starting with pk-
    if (publicKey && publicKey.startsWith('pk-')) {
        return { projectId: 'default', publicKey }
    }
    
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    // 1. Auth
    const auth = await validateAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse Body
    const body = await request.json()
    const { batch } = body

    if (!batch || !Array.isArray(batch)) {
        return NextResponse.json({ error: 'Invalid batch format' }, { status: 400 })
    }

    const successes: { id: string, status: number }[] = []
    const tracesToInsert: TraceData[] = []

    // 3. Process Events
    for (const event of batch as LangfuseEvent[]) {
      try {
        if (event.type === 'trace-create' || event.type === 'generation-create') {
            const traceData: TraceData = {
                id: event.id,
                projectId: auth.projectId,
                name: event.body?.name || event.body?.model || event.type,
                timestamp: event.timestamp,
                // Trace inputs/outputs
                input: event.body?.input ? JSON.stringify(event.body.input) : undefined,
                output: event.body?.output ? JSON.stringify(event.body.output) : undefined,
                metadata: (event.body?.metadata as Record<string, string>) || {}, // SimpleFuse uses Record<string, string>
                tags: [event.type],
                // For generations:
                totalTokens: event.body?.usage?.totalTokens,
                latencyMs: undefined, // Langfuse sends start/end time usually, simplifying for now
                status: 'success' 
            }
            tracesToInsert.push(traceData)
        }
        
        successes.push({ id: event.id, status: 201 })
      } catch (e) {
         // simplified error handling
         console.error('Error processing event', e)
         successes.push({ id: event.id, status: 500 })
      }
    }

    // 4. Batch Insert
    if (tracesToInsert.length > 0) {
        await insertTraces(tracesToInsert)
    }

    return NextResponse.json({ successes }, { status: 200 })

  } catch (error) {
    console.error('Ingestion API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
