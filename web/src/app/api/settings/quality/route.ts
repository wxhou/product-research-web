import { NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';
import { DEFAULT_QUALITY_SETTINGS, type ReportQualitySettings } from '@/lib/settings/quality';

const QUALITY_SETTINGS_KEY = 'report-quality-settings';

/**
 * GET /api/settings/quality - 获取质量检查设置
 */
export async function GET() {
  try {
    const row = settingsDb.get.get({ key: QUALITY_SETTINGS_KEY }) as { value: string } | undefined;
    if (row) {
      const settings = JSON.parse(row.value);
      return NextResponse.json({
        success: true,
        data: { ...DEFAULT_QUALITY_SETTINGS, ...settings },
      });
    }
    return NextResponse.json({
      success: true,
      data: DEFAULT_QUALITY_SETTINGS,
    });
  } catch (error) {
    console.error('[QualitySettings] GET error:', error);
    return NextResponse.json(
      { success: false, error: '获取设置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/quality - 更新质量检查设置
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const settings: Partial<ReportQualitySettings> = body;

    // 合并现有设置
    const row = settingsDb.get.get({ key: QUALITY_SETTINGS_KEY }) as { value: string } | undefined;
    const existingSettings = row ? JSON.parse(row.value) : DEFAULT_QUALITY_SETTINGS;
    const mergedSettings = { ...existingSettings, ...settings };

    // 保存设置
    settingsDb.set.run({
      key: QUALITY_SETTINGS_KEY,
      value: JSON.stringify(mergedSettings),
    });

    return NextResponse.json({
      success: true,
      data: mergedSettings,
    });
  } catch (error) {
    console.error('[QualitySettings] PUT error:', error);
    return NextResponse.json(
      { success: false, error: '保存设置失败' },
      { status: 500 }
    );
  }
}
