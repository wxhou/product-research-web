import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';

interface Crawl4AIConfig {
  url: string | null;
  enabled: boolean;
}

// GET /api/settings/crawl4ai
export async function GET() {
  try {
    const result = settingsDb.get.get({ key: 'crawl4ai_config' }) as { value: string } | undefined;
    let config: Crawl4AIConfig | null = null;

    if (result?.value) {
      try {
        config = JSON.parse(result.value);
      } catch (e) {
        console.error('Failed to parse Crawl4AI config:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: config || {
        url: 'http://localhost:8000',
        enabled: false,
      },
    });
  } catch (error) {
    console.error('Error fetching Crawl4AI config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Crawl4AI config' },
      { status: 500 }
    );
  }
}

// POST /api/settings/crawl4ai
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, enabled } = body as Partial<Crawl4AIConfig>;

    // 验证 URL 格式
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json(
        { success: false, error: 'URL must start with http:// or https://' },
        { status: 400 }
      );
    }

    const config: Crawl4AIConfig = {
      url: url || null,
      enabled: enabled ?? false,
    };

    settingsDb.set.run({
      key: 'crawl4ai_config',
      value: JSON.stringify(config),
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving Crawl4AI config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save Crawl4AI config' },
      { status: 500 }
    );
  }
}
