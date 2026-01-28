/**
 * LLM 客户端模块
 *
 * 支持 OpenAI 兼容的 API，包括：
 * - OpenAI (GPT-4, GPT-3.5)
 * - Azure OpenAI
 * - DeepSeek
 * - Anthropic (Claude)
 * - Google Gemini
 * - Moonshot (Kimi)
 * - ModelScope (魔搭)
 * - SiliconFlow (硅基流动)
 * - 任何 OpenAI 兼容的本地/自定义 API
 */

import { settingsDb } from '@/lib/db';

export interface LLMConfig {
  provider: string;
  baseUrl: string | null;
  apiKey: string | null;
  modelName: string | null;
  temperature: number;
  timeout: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 默认配置
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  baseUrl: null,
  apiKey: null,
  modelName: 'gpt-4',
  temperature: 0.7,
  timeout: 120,
};

/**
 * 获取当前 LLM 配置
 */
export function getLLMConfig(): LLMConfig {
  try {
    const result = settingsDb.get.get({ key: 'llm_config' }) as { value: string } | undefined;
    if (result?.value) {
      const config = JSON.parse(result.value);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (e) {
    console.error('Failed to get LLM config:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * 获取 API 基础地址
 */
function getBaseUrl(config: LLMConfig): string {
  if (config.baseUrl) {
    return config.baseUrl.replace(/\/$/, '');
  }

  switch (config.provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'azure':
      return 'https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}';
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'moonshot':
      return 'https://api.moonshot.cn/v1';
    case 'modelscope':
      return 'https://api-inference.modelscope.cn/v1';
    case 'siliconflow':
      return 'https://api.siliconflow.cn/v1';
    default:
      return 'https://api.openai.com/v1';
  }
}

/**
 * 构建请求头
 */
function getHeaders(config: LLMConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    switch (config.provider) {
      case 'anthropic':
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'gemini':
        headers['x-goog-api-key'] = config.apiKey;
        break;
      default:
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  return headers;
}

/**
 * 转换消息格式（适配不同 API）
 */
function formatMessages(messages: LLMMessage[], provider: string): Record<string, unknown> {
  if (provider === 'anthropic') {
    // Anthropic 格式
    const systemMsg = messages.find(m => m.role === 'system');
    const userMsgs = messages.filter(m => m.role !== 'system');
    return {
      system: systemMsg?.content,
      messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
    };
  }

  if (provider === 'gemini') {
    // Gemini 格式
    return {
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    };
  }

  // OpenAI 兼容格式
  return { messages };
}

/**
 * 解析响应内容
 */
function parseResponse(data: Record<string, unknown>, provider: string): LLMResponse {
  if (provider === 'gemini') {
    const candidates = data.candidates as unknown[] | undefined;
    const content = (candidates?.[0] as { content?: { parts?: { text?: string }[] } } | undefined)?.content;
    return {
      content: content?.parts?.[0]?.text || '',
    };
  }

  if (provider === 'anthropic') {
    const content = (data.content as { text?: string }[])?.[0]?.text || '';
    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    return {
      content,
      usage: {
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      },
    };
  }

  // OpenAI 兼容格式
  const content = (data.choices as { message?: { content?: string } }[])?.[0]?.message?.content || '';
  const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
  return {
    content,
    usage: {
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
    },
  };
}

/**
 * 调用 LLM API
 */
export async function callLLM(
  messages: LLMMessage[],
  options?: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    role?: 'analyzer' | 'extractor' | 'reporter'; // 模型角色
  }
): Promise<LLMResponse> {
  const config = getLLMConfig();
  const role = options?.role;

  // 如果指定了角色，尝试从模型角色配置中获取自定义配置
  let modelConfig = config;
  if (role) {
    try {
      const { getModelConfig } = await import('@/lib/model-roles');
      const roleConfig = getModelConfig(role);
      if (roleConfig && roleConfig.model && roleConfig.model.trim() !== '') {
        // 使用角色自定义配置
        modelConfig = {
          ...config,
          modelName: roleConfig.model,
          baseUrl: roleConfig.baseUrl || config.baseUrl,
          apiKey: roleConfig.apiKey || config.apiKey,
        };
        console.log(`[LLM] Using ${role} config: ${modelConfig.modelName} @ ${modelConfig.baseUrl || 'default'}`);
      }
    } catch (e) {
      console.error(`[LLM] Failed to load config for role '${role}':`, e);
    }
  }

  const modelName = options?.modelName || modelConfig.modelName || 'gpt-4';
  const temperature = options?.temperature ?? modelConfig.temperature ?? 0.7;
  const timeout = modelConfig.timeout * 1000;

  const baseUrl = getBaseUrl(modelConfig);
  const headers = getHeaders(modelConfig);
  const messageFormat = formatMessages(messages, modelConfig.provider);

  // 替换 Azure 占位符
  let url = baseUrl;
  if (modelConfig.provider === 'azure') {
    url = baseUrl
      .replace('{resource-name}', modelConfig.baseUrl?.split('.')[0] || 'your-resource')
      .replace('{deployment-name}', modelName);
  } else {
    url = `${baseUrl}/chat/completions`;
  }

  const body: Record<string, unknown> = {
    ...messageFormat,
    model: modelName,
    temperature,
    max_tokens: options?.maxTokens || 4096,
  };

  // Gemini 使用不同端点
  if (modelConfig.provider === 'gemini') {
    url = `${baseUrl}/models/${modelName}:generateContent`;
  }

  console.log(`[LLM] Calling API: provider=${modelConfig.provider}, model=${modelName}, baseUrl=${baseUrl}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.log(`[LLM] Request body:`, JSON.stringify(body, null, 2).substring(0, 500));

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`[LLM] API response status: ${res.status}`);
    console.log(`[LLM] Response headers:`, Object.fromEntries([...res.headers.entries()].slice(0, 10)));

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[LLM] API error details:`, errorText.substring(0, 1000));
      throw new Error(`LLM API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json() as Record<string, unknown>;
    console.log(`[LLM] Response data keys:`, Object.keys(data));
    const response = parseResponse(data, modelConfig.provider);
    console.log(`[LLM] Parsed response length: ${response.content.length}`);
    console.log(`[LLM] Response preview: ${response.content.substring(0, 200).replace(/\n/g, ' ')}`);
    return response;
  } catch (error) {
    console.error('LLM API call failed:', error);
    throw error;
  }
}

/**
 * 简单的文本生成（单轮对话）
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options?: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    role?: 'analyzer' | 'extractor' | 'reporter';
  }
): Promise<string> {
  const messages: LLMMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await callLLM(messages, options);
  return response.content.trim();
}

/**
 * 产品分析专家提示词
 */
export const PRODUCT_ANALYST_PROMPT = `你是一位专业的产品调研分析师，专注于科技产品的功能分析、市场研究和竞品对比。

请根据提供的搜索结果信息，进行深入分析并输出结构化的调研报告。

分析要求：
1. 识别产品核心功能，统计功能出现频率
2. 分析竞品特点和市场定位
3. 进行 SWOT 分析
4. 识别市场机会和创新方向
5. 提供技术路线建议

请保持客观、专业的分析视角，使用具体数据支撑你的结论。`;

export default {
  getLLMConfig,
  callLLM,
  generateText,
  PRODUCT_ANALYST_PROMPT,
};
