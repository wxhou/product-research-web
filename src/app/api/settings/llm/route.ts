import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';

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

    // 返回默认配置
    return NextResponse.json({
      success: true,
      data: config || {
        provider: 'modelscope',
        baseUrl: null,
        apiKey: null,
        modelName: 'deepseek-ai/DeepSeek-R1-0528',
        temperature: 0.7,
        timeout: 120,
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
    const validProviders = ['openai', 'azure', 'anthropic', 'deepseek', 'gemini', 'moonshot', 'modelscope', 'siliconflow', 'compatible'];
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

    if (timeout !== undefined && (isNaN(timeout) || timeout < 30 || timeout > 300)) {
      return NextResponse.json(
        { success: false, error: 'Timeout must be between 30 and 300 seconds' },
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
      provider: provider || existingConfig?.provider || 'openai',
      // 只有兼容模式才保存自定义 baseUrl，否则设为 null
      baseUrl: (provider === 'compatible' || provider === 'azure') ? (baseUrl || existingConfig?.baseUrl || null) : null,
      apiKey: apiKey || null,
      // 保留现有模型名称或使用默认值
      modelName: modelName || existingConfig?.modelName || 'deepseek-ai/DeepSeek-R1-0528',
      temperature: temperature || existingConfig?.temperature || 0.7,
      timeout: timeout || existingConfig?.timeout || 120,
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
