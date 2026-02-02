import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';

interface Crawl4AIConfig {
  enabled: boolean;
  baseUrl: string;
  timeout: number;
  maxLength: number;
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
        enabled: false,
        baseUrl: 'http://192.168.0.124:11235',
        timeout: 60000,
        maxLength: 100000,
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
    const { enabled, baseUrl, timeout, maxLength } = body as Partial<Crawl4AIConfig>;

    const config: Crawl4AIConfig = {
      enabled: enabled ?? false,
      baseUrl: baseUrl ?? 'http://192.168.0.124:11235',
      timeout: timeout ?? 60000,
      maxLength: maxLength ?? 100000,
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
