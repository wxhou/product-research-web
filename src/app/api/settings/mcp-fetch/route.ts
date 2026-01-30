import { NextRequest, NextResponse } from 'next/server';
import { settingsDb } from '@/lib/db';

interface McpFetchConfig {
  enabled: boolean;
  maxLength: number;
}

// GET /api/settings/mcp-fetch
export async function GET() {
  try {
    const result = settingsDb.get.get({ key: 'mcp_fetch_config' }) as { value: string } | undefined;
    let config: McpFetchConfig | null = null;

    if (result?.value) {
      try {
        config = JSON.parse(result.value);
      } catch (e) {
        console.error('Failed to parse MCP Fetch config:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: config || {
        enabled: false,
        maxLength: 50000,
      },
    });
  } catch (error) {
    console.error('Error fetching MCP Fetch config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch MCP Fetch config' },
      { status: 500 }
    );
  }
}

// POST /api/settings/mcp-fetch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled, maxLength } = body as Partial<McpFetchConfig>;

    const config: McpFetchConfig = {
      enabled: enabled ?? false,
      maxLength: maxLength ?? 50000,
    };

    settingsDb.set.run({
      key: 'mcp_fetch_config',
      value: JSON.stringify(config),
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error saving MCP Fetch config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save MCP Fetch config' },
      { status: 500 }
    );
  }
}
