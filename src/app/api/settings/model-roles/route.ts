import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';

interface ModelRoleConfig {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
}

interface ModelRolesConfig {
  analyzer: ModelRoleConfig;
  extractor: ModelRoleConfig;
  reporter: ModelRoleConfig;
}

// GET /api/settings/model-roles
export async function GET() {
  try {
    const result = settingsDb.get.get({ key: 'model_roles_config' }) as { value: string } | undefined;
    let config: ModelRolesConfig | null = null;

    if (result?.value) {
      try {
        config = JSON.parse(result.value);
      } catch (e) {
        console.error('Failed to parse model roles config:', e);
      }
    }

    // 默认配置
    if (!config) {
      config = {
        analyzer: { model: '', enabled: false },
        extractor: { model: '', enabled: false },
        reporter: { model: '', enabled: false },
      };
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching model roles config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model roles config' },
      { status: 500 }
    );
  }
}

// POST /api/settings/model-roles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analyzer, extractor, reporter } = body as {
      analyzer?: ModelRoleConfig;
      extractor?: ModelRoleConfig;
      reporter?: ModelRoleConfig;
    };

    const config: ModelRolesConfig = {
      analyzer: analyzer || { model: '', enabled: false },
      extractor: extractor || { model: '', enabled: false },
      reporter: reporter || { model: '', enabled: false },
    };

    settingsDb.set.run({
      key: 'model_roles_config',
      value: JSON.stringify(config),
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving model roles config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save model roles config' },
      { status: 500 }
    );
  }
}
