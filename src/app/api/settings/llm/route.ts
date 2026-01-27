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
        provider: 'openai',
        baseUrl: null,
        apiKey: null,
        modelName: 'gpt-4',
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
    const validProviders = ['openai', 'azure', 'anthropic', 'deepseek', 'gemini', 'moonshot', 'compatible'];
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

    const config: LLMConfig = {
      provider: provider || 'openai',
      baseUrl: baseUrl || null,
      apiKey: apiKey || null,
      modelName: modelName || null,
      temperature: temperature || 0.7,
      timeout: timeout || 120,
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
