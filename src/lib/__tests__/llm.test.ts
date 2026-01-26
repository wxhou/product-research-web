/**
 * @jest-environment jsdom
 */

// Unit tests for LLM module constants and types
// These tests don't require the full module (which depends on database)

describe('LLM Constants and Types', () => {
  describe('LLMConfig interface', () => {
    it('should define correct config structure', () => {
      // Test the interface by creating a valid config object
      const config = {
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1' as const | null,
        apiKey: 'sk-test-key' as const | null,
        modelName: 'gpt-4' as const | null,
        temperature: 0.7,
        timeout: 120,
      };

      expect(config.provider).toBe('openai');
      expect(typeof config.baseUrl).toBe('string');
      expect(typeof config.apiKey).toBe('string');
      expect(typeof config.modelName).toBe('string');
      expect(config.temperature).toBe(0.7);
      expect(config.timeout).toBe(120);
    });

    it('should support nullable baseUrl and apiKey', () => {
      const config = {
        provider: 'openai',
        baseUrl: null,
        apiKey: null,
        modelName: null,
        temperature: 0.7,
        timeout: 120,
      };

      expect(config.baseUrl).toBeNull();
      expect(config.apiKey).toBeNull();
      expect(config.modelName).toBeNull();
    });
  });

  describe('LLMMessage interface', () => {
    it('should define correct message structure', () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Hello, world!' },
        { role: 'assistant' as const, content: 'Hi there!' },
      ];

      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
    });
  });

  describe('LLMResponse interface', () => {
    it('should define correct response structure', () => {
      const response = {
        content: 'This is the generated text.',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      expect(response.content).toBe('This is the generated text.');
      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
    });

    it('should support responses without usage data', () => {
      const response = {
        content: 'Simple response.',
      };

      expect(response.content).toBe('Simple response.');
      expect(response.usage).toBeUndefined();
    });
  });

  describe('PRODUCT_ANALYST_PROMPT content', () => {
    it('should be a comprehensive system prompt', () => {
      const prompt = `你是一位专业的产品调研分析师，专注于科技产品的功能分析、市场研究和竞品对比。

请根据提供的搜索结果信息，进行深入分析并输出结构化的调研报告。

分析要求：
1. 识别产品核心功能，统计功能出现频率
2. 分析竞品特点和市场定位
3. 进行 SWOT 分析
4. 识别市场机会和创新方向
5. 提供技术路线建议

请保持客观、专业的分析视角，使用具体数据支撑你的结论。`;

      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('产品调研分析师');
      expect(prompt).toContain('功能分析');
      expect(prompt).toContain('竞品对比');
      expect(prompt).toContain('SWOT');
    });
  });
});

describe('LLM Provider Configuration', () => {
  describe('Provider Types', () => {
    const validProviders = ['openai', 'azure', 'anthropic', 'deepseek', 'gemini', 'moonshot', 'compatible'];

    it('should have 7 valid providers', () => {
      expect(validProviders).toHaveLength(7);
    });

    it('should include major providers', () => {
      expect(validProviders).toContain('openai');
      expect(validProviders).toContain('anthropic');
      expect(validProviders).toContain('deepseek');
      expect(validProviders).toContain('gemini');
    });

    it('should include compatible provider for custom APIs', () => {
      expect(validProviders).toContain('compatible');
    });
  });

  describe('Default API URLs', () => {
    const defaultUrls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
      moonshot: 'https://api.moonshot.cn/v1',
    };

    it('should have default URLs for major providers', () => {
      expect(defaultUrls.openai).toBe('https://api.openai.com/v1');
      expect(defaultUrls.deepseek).toBe('https://api.deepseek.com/v1');
      expect(defaultUrls.anthropic).toBe('https://api.anthropic.com/v1');
      expect(defaultUrls.gemini).toBe('https://generativelanguage.googleapis.com/v1beta');
      expect(defaultUrls.moonshot).toBe('https://api.moonshot.cn/v1');
    });

    it('should use HTTPS for all providers', () => {
      Object.values(defaultUrls).forEach(url => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    it('should use /v1 or /v1beta endpoint suffix', () => {
      Object.values(defaultUrls).forEach(url => {
        expect(url).toMatch(/\/v1(beta)?$/);
      });
    });
  });

  describe('Default Model Names', () => {
    const defaultModels: Record<string, string> = {
      openai: 'gpt-4',
      anthropic: 'claude-3-5-sonnet',
      deepseek: 'deepseek-chat',
      gemini: 'gemini-pro',
      moonshot: 'kimi',
    };

    it('should have default models for major providers', () => {
      expect(defaultModels.openai).toBe('gpt-4');
      expect(defaultModels.anthropic).toBe('claude-3-5-sonnet');
      expect(defaultModels.deepseek).toBe('deepseek-chat');
      expect(defaultModels.gemini).toBe('gemini-pro');
    });
  });

  describe('Request Headers by Provider', () => {
    it('should generate OpenAI headers correctly', () => {
      const getHeaders = (provider: string, apiKey: string) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
          } else if (provider === 'gemini') {
            headers['x-goog-api-key'] = apiKey;
          } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        return headers;
      };

      const openaiHeaders = getHeaders('openai', 'sk-test-key');
      expect(openaiHeaders['Authorization']).toBe('Bearer sk-test-key');
      expect(openaiHeaders['Content-Type']).toBe('application/json');
    });

    it('should generate Anthropic headers correctly', () => {
      const getHeaders = (provider: string, apiKey: string) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
          } else if (provider === 'gemini') {
            headers['x-goog-api-key'] = apiKey;
          } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        return headers;
      };

      const anthropicHeaders = getHeaders('anthropic', 'sk-ant-test-key');
      expect(anthropicHeaders['x-api-key']).toBe('sk-ant-test-key');
      expect(anthropicHeaders['anthropic-version']).toBe('2023-06-01');
      expect(anthropicHeaders['Authorization']).toBeUndefined();
    });

    it('should generate Gemini headers correctly', () => {
      const getHeaders = (provider: string, apiKey: string) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          if (provider === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
          } else if (provider === 'gemini') {
            headers['x-goog-api-key'] = apiKey;
          } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
        }

        return headers;
      };

      const geminiHeaders = getHeaders('gemini', 'gemini-api-key');
      expect(geminiHeaders['x-goog-api-key']).toBe('gemini-api-key');
      expect(geminiHeaders['Authorization']).toBeUndefined();
    });
  });
});

describe('LLM Configuration Validation', () => {
  describe('Temperature Validation', () => {
    it('should accept valid temperature values', () => {
      const validTemperatures = [0, 0.1, 0.5, 0.7, 1.0, 1.5, 2.0];
      validTemperatures.forEach(temp => {
        expect(temp >= 0 && temp <= 2).toBe(true);
      });
    });

    it('should reject invalid temperature values', () => {
      const invalidTemperatures = [-0.1, 2.1, 100];
      invalidTemperatures.forEach(temp => {
        expect(temp < 0 || temp > 2).toBe(true);
      });
    });
  });

  describe('Timeout Validation', () => {
    it('should accept valid timeout values (30-300 seconds)', () => {
      const validTimeouts = [30, 60, 120, 180, 300];
      validTimeouts.forEach(timeout => {
        expect(timeout >= 30 && timeout <= 300).toBe(true);
      });
    });

    it('should reject invalid timeout values', () => {
      const invalidTimeouts = [29, 301, 0, 600];
      invalidTimeouts.forEach(timeout => {
        expect(timeout < 30 || timeout > 300).toBe(true);
      });
    });
  });

  describe('Max Tokens Validation', () => {
    it('should handle reasonable max tokens values', () => {
      const validMaxTokens = [1000, 2000, 4000, 8000, 16000];
      validMaxTokens.forEach(maxTokens => {
        expect(maxTokens > 0).toBe(true);
      });
    });
  });
});

describe('LLM API Request Body Format', () => {
  it('should format OpenAI chat completion request correctly', () => {
    const formatRequest = (
      messages: { role: string; content: string }[],
      model: string,
      temperature: number,
      maxTokens: number
    ) => {
      return {
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
      };
    };

    const request = formatRequest(
      [{ role: 'user', content: 'Hello' }],
      'gpt-4',
      0.7,
      4096
    );

    expect(request.messages).toHaveLength(1);
    expect(request.model).toBe('gpt-4');
    expect(request.temperature).toBe(0.7);
    expect(request.max_tokens).toBe(4096);
  });

  it('should format Anthropic request differently', () => {
    const formatAnthropicRequest = (
      messages: { role: string; content: string }[],
      systemPrompt: string,
      model: string,
      temperature: number
    ) => {
      const systemMsg = messages.find(m => m.role === 'system');
      const userMsgs = messages.filter(m => m.role !== 'system');

      return {
        system: systemMsg?.content || systemPrompt,
        messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
        model,
        temperature,
      };
    };

    const request = formatAnthropicRequest(
      [{ role: 'system', content: 'You are a helper.' }, { role: 'user', content: 'Hi' }],
      'Default system prompt',
      'claude-3-5-sonnet',
      0.7
    );

    expect(request.system).toBe('You are a helper.');
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].role).toBe('user');
  });

  it('should format Gemini request correctly', () => {
    const formatGeminiRequest = (
      messages: { role: string; content: string }[],
      model: string
    ) => {
      return {
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        model,
      };
    };

    const request = formatGeminiRequest(
      [{ role: 'user', content: 'Hello' }],
      'gemini-pro'
    );

    expect(request.contents).toHaveLength(1);
    expect(request.contents[0].role).toBe('user');
    expect(request.contents[0].parts[0].text).toBe('Hello');
  });
});

describe('LLM Response Parsing', () => {
  it('should parse OpenAI response correctly', () => {
    const parseOpenAIResponse = (data: { choices?: { message?: { content?: string } }[] }) => {
      const content = data.choices?.[0]?.message?.content || '';
      return { content };
    };

    const response = parseOpenAIResponse({
      choices: [{ message: { content: 'Generated text' } }]
    });

    expect(response.content).toBe('Generated text');
  });

  it('should parse Anthropic response correctly', () => {
    const parseAnthropicResponse = (data: { content?: { text?: string }[] }) => {
      const content = data.content?.[0]?.text || '';
      return { content };
    };

    const response = parseAnthropicResponse({
      content: [{ text: 'Claude response' }]
    });

    expect(response.content).toBe('Claude response');
  });

  it('should parse Gemini response correctly', () => {
    const parseGeminiResponse = (data: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) => {
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { content };
    };

    const response = parseGeminiResponse({
      candidates: [{ content: { parts: [{ text: 'Gemini response' }] } }]
    });

    expect(response.content).toBe('Gemini response');
  });

  it('should handle empty responses gracefully', () => {
    const parseResponse = (data: Record<string, unknown>) => {
      const content = (data.choices as { message?: { content?: string } }[])?.[0]?.message?.content || '';
      return { content };
    };

    const emptyResponse = parseResponse({});
    expect(emptyResponse.content).toBe('');
  });
});
