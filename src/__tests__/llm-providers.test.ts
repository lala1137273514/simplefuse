/**
 * LLM Providers 测试 - TDD 补做
 * 
 * 测试 5 种 Provider 的接口和工厂函数
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  OpenAIProvider,
  AzureOpenAIProvider,
  DashscopeProvider,
  OllamaProvider,
  CustomProvider,
  createLlmProvider,
  createProviderFromDbConfig,
  type LlmProviderConfig,
} from '../lib/llm/providers'

// Mock fetch
global.fetch = vi.fn()

describe('LLM Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OpenAIProvider', () => {
    const config: LlmProviderConfig = {
      provider: 'openai',
      modelName: 'gpt-4-turbo',
      apiKey: 'sk-test-key',
    }

    it('应该正确调用 OpenAI API', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4-turbo',
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const provider = new OpenAIProvider(config)
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.content).toBe('Hello!')
      expect(result.usage.totalTokens).toBe(15)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
          }),
        })
      )
    })

    it('应该处理 API 错误', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
        statusText: 'Unauthorized',
      } as Response)

      const provider = new OpenAIProvider(config)
      
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('OpenAI API Error')
    })
  })

  describe('AzureOpenAIProvider', () => {
    const config: LlmProviderConfig = {
      provider: 'azure',
      modelName: 'gpt-4',
      apiKey: 'azure-api-key',
      apiEndpoint: 'https://my-resource.openai.azure.com',
    }

    it('应该正确调用 Azure OpenAI API', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Azure response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4',
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const provider = new AzureOpenAIProvider(config)
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.content).toBe('Azure response')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('my-resource.openai.azure.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'azure-api-key',
          }),
        })
      )
    })

    it('缺少 apiEndpoint 应该抛出错误', async () => {
      const provider = new AzureOpenAIProvider({
        ...config,
        apiEndpoint: undefined,
      })
      
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Azure OpenAI requires apiEndpoint')
    })
  })

  describe('DashscopeProvider', () => {
    const config: LlmProviderConfig = {
      provider: 'dashscope',
      modelName: 'qwen-max',
      apiKey: 'dashscope-key',
    }

    it('应该正确调用通义千问 API', async () => {
      const mockResponse = {
        output: {
          choices: [{ message: { content: 'Qwen response' }, finish_reason: 'stop' }],
        },
        usage: { input_tokens: 10, output_tokens: 5 },
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const provider = new DashscopeProvider(config)
      const result = await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(result.content).toBe('Qwen response')
      expect(result.usage.totalTokens).toBe(15)
    })
  })

  describe('OllamaProvider', () => {
    const config: LlmProviderConfig = {
      provider: 'ollama',
      modelName: 'llama2',
    }

    it('应该使用默认地址 localhost:11434', async () => {
      const mockResponse = {
        message: { content: 'Ollama response' },
        model: 'llama2',
        done: true,
        prompt_eval_count: 10,
        eval_count: 5,
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const provider = new OllamaProvider(config)
      await provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.any(Object)
      )
    })
  })

  describe('CustomProvider', () => {
    it('缺少 apiEndpoint 应该抛出错误', async () => {
      const provider = new CustomProvider({
        provider: 'custom',
        modelName: 'my-model',
      })
      
      await expect(provider.chat({
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Custom provider requires apiEndpoint')
    })
  })

  describe('createLlmProvider 工厂函数', () => {
    it('应该为 openai 返回 OpenAIProvider', () => {
      const provider = createLlmProvider({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'key',
      })
      expect(provider).toBeInstanceOf(OpenAIProvider)
    })

    it('应该为 azure 返回 AzureOpenAIProvider', () => {
      const provider = createLlmProvider({
        provider: 'azure',
        modelName: 'gpt-4',
        apiKey: 'key',
        apiEndpoint: 'https://test.com',
      })
      expect(provider).toBeInstanceOf(AzureOpenAIProvider)
    })

    it('应该为 dashscope 返回 DashscopeProvider', () => {
      const provider = createLlmProvider({
        provider: 'dashscope',
        modelName: 'qwen-max',
        apiKey: 'key',
      })
      expect(provider).toBeInstanceOf(DashscopeProvider)
    })

    it('应该为 ollama 返回 OllamaProvider', () => {
      const provider = createLlmProvider({
        provider: 'ollama',
        modelName: 'llama2',
      })
      expect(provider).toBeInstanceOf(OllamaProvider)
    })

    it('应该为 custom 返回 CustomProvider', () => {
      const provider = createLlmProvider({
        provider: 'custom',
        modelName: 'my-model',
        apiEndpoint: 'https://api.example.com',
      })
      expect(provider).toBeInstanceOf(CustomProvider)
    })
  })

  describe('createProviderFromDbConfig', () => {
    it('应该正确解密 API Key (base64)', () => {
      const encryptedKey = Buffer.from('sk-test-key').toString('base64')
      
      const provider = createProviderFromDbConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        apiKeyEncrypted: encryptedKey,
        apiEndpoint: null,
        config: null,
      })

      expect(provider).toBeInstanceOf(OpenAIProvider)
    })
  })
})
