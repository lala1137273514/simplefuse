/**
 * LLM Provider 统一接口
 * 
 * 支持多种 LLM Provider:
 * - OpenAI
 * - Azure OpenAI
 * - 通义千问 (Dashscope)
 * - Ollama
 * - Custom
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmCompletionRequest {
  messages: LlmMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
}

export interface LlmCompletionResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason: string
}

export interface LlmProviderConfig {
  provider: 'openai' | 'azure' | 'dashscope' | 'ollama' | 'custom'
  modelName: string
  apiKey?: string
  apiEndpoint?: string
  config?: Record<string, unknown>
}

/**
 * LLM Provider 基类
 */
export abstract class BaseLlmProvider {
  protected config: LlmProviderConfig

  constructor(config: LlmProviderConfig) {
    this.config = config
  }

  abstract chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse>
  
  /**
   * 测试连接是否正常
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 10,
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider extends BaseLlmProvider {
  private baseUrl = 'https://api.openai.com/v1'

  async chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1024,
        top_p: request.topP ?? 1,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API Error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    }
  }
}

/**
 * Azure OpenAI Provider
 */
export class AzureOpenAIProvider extends BaseLlmProvider {
  async chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    if (!this.config.apiEndpoint) {
      throw new Error('Azure OpenAI requires apiEndpoint')
    }

    const response = await fetch(
      `${this.config.apiEndpoint}/openai/deployments/${this.config.modelName}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey || '',
        },
        body: JSON.stringify({
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          top_p: request.topP ?? 1,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Azure OpenAI API Error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    }
  }
}

/**
 * 通义千问 (Dashscope) Provider
 */
export class DashscopeProvider extends BaseLlmProvider {
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1'

  async chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        input: {
          messages: request.messages,
        },
        parameters: {
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          top_p: request.topP ?? 0.8,
          result_format: 'message',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Dashscope API Error: ${error.message || response.statusText}`)
    }

    const data = await response.json()
    
    if (data.code) {
      throw new Error(`Dashscope API Error: ${data.message}`)
    }
    
    return {
      content: data.output.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: this.config.modelName,
      finishReason: data.output.choices[0].finish_reason || 'stop',
    }
  }
}

/**
 * Ollama Provider (本地模型)
 */
export class OllamaProvider extends BaseLlmProvider {
  private get baseUrl() {
    return this.config.apiEndpoint || 'http://localhost:11434'
  }

  async chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 1024,
          top_p: request.topP ?? 0.9,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.message.content,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      model: data.model,
      finishReason: data.done ? 'stop' : 'length',
    }
  }
}

/**
 * Custom Provider (兼容 OpenAI 格式的自定义端点)
 */
export class CustomProvider extends BaseLlmProvider {
  async chat(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    if (!this.config.apiEndpoint) {
      throw new Error('Custom provider requires apiEndpoint')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.modelName,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1024,
        top_p: request.topP ?? 1,
        ...this.config.config,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Custom API Error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model || this.config.modelName,
      finishReason: data.choices[0].finish_reason || 'stop',
    }
  }
}

/**
 * 根据配置创建 Provider 实例
 */
export function createLlmProvider(config: LlmProviderConfig): BaseLlmProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'azure':
      return new AzureOpenAIProvider(config)
    case 'dashscope':
      return new DashscopeProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    case 'custom':
      return new CustomProvider(config)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * 从数据库配置创建 Provider
 */
export function createProviderFromDbConfig(dbConfig: {
  provider: string
  modelName: string
  apiKeyEncrypted: string | null
  apiEndpoint: string | null
  config: unknown
}): BaseLlmProvider {
  // 简单的 base64 解密 (生产环境应使用 AES)
  const apiKey = dbConfig.apiKeyEncrypted 
    ? Buffer.from(dbConfig.apiKeyEncrypted, 'base64').toString('utf-8')
    : undefined

  return createLlmProvider({
    provider: dbConfig.provider as LlmProviderConfig['provider'],
    modelName: dbConfig.modelName,
    apiKey,
    apiEndpoint: dbConfig.apiEndpoint || undefined,
    config: dbConfig.config as Record<string, unknown> | undefined,
  })
}
