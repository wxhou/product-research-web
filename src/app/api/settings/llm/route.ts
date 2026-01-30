import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';
import { getLLMConfig } from '@/lib/llm';

interface LLMConfig {
  provider: string;
  baseUrl: string | null;
  apiKey: string | null;
  modelName: string | null;
  temperature: number;
  timeout: number;
}

// GET /api/settings/llm
export async function GET() {
  try {
    const result = settingsDb.get.get({ key: 'llm_config' }) as { value: string } | undefined;
    let config: LLMConfig | null = null;

    if (result?.value) {
      try {
        config = JSON.parse(result.value);
      } catch (e) {
        console.error('Failed to parse LLM config:', e);
      }
    }

    // 返回数据库配置或默认配置
    if (config) {
      return NextResponse.json({
        success: true,
        data: config,
      });
    }

    // 返回默认配置
    const defaultConfig = getLLMConfig();
    return NextResponse.json({
      success: true,
      data: {
        provider: defaultConfig.provider,
        baseUrl: defaultConfig.baseUrl,
        apiKey: defaultConfig.apiKey,
        modelName: defaultConfig.modelName,
        temperature: defaultConfig.temperature,
        timeout: defaultConfig.timeout,
      },
    });
  } catch (error) {
    console.error('Error fetching LLM config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch LLM config' },
      { status: 500 }
    );
  }
}

// POST /api/settings/llm
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, baseUrl, apiKey, modelName, temperature, timeout } = body as Partial<LLMConfig>;

    // 验证输入
    const validProviders = ['openai', 'azure', 'anthropic', 'deepseek', 'gemini', 'moonshot', 'modelscope', 'siliconflow', 'compatible', 'ollama'];
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider' },
        { status: 400 }
      );
    }

    if (temperature !== undefined && (isNaN(temperature) || temperature < 0 || temperature > 2)) {
      return NextResponse.json(
        { success: false, error: 'Temperature must be between 0 and 2' },
        { status: 400 }
      );
    }

    if (timeout !== undefined && (isNaN(timeout) || timeout < 30 || timeout > 600)) {
      return NextResponse.json(
        { success: false, error: 'Timeout must be between 30 and 600 seconds' },
        { status: 400 }
      );
    }

    // 获取现有配置，保留未提供的值
    const existingResult = settingsDb.get.get({ key: 'llm_config' }) as { value: string } | undefined;
    let existingConfig: LLMConfig | null = null;
    if (existingResult?.value) {
      try {
        existingConfig = JSON.parse(existingResult.value);
      } catch (e) {
        // ignore
      }
    }

    const config: LLMConfig = {
      provider: provider || existingConfig?.provider || getLLMConfig().provider,
      // Ollama 或兼容模式保存自定义 baseUrl
      baseUrl: (provider === 'ollama' || provider === 'compatible' || provider === 'azure')
        ? (baseUrl || existingConfig?.baseUrl || getLLMConfig().baseUrl)
        : null,
      apiKey: apiKey || null,
      // 保留现有模型名称或使用默认值
      modelName: modelName || existingConfig?.modelName || getLLMConfig().modelName,
      temperature: temperature || existingConfig?.temperature || getLLMConfig().temperature,
      timeout: timeout || existingConfig?.timeout || getLLMConfig().timeout,
    };

    settingsDb.set.run({
      key: 'llm_config',
      value: JSON.stringify(config),
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving LLM config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save LLM config' },
      { status: 500 }
    );
  }
}
