import { NextRequest, NextResponse } from 'next/server';
import { dataSourceDb } from '@/lib/db';

interface DataSource {
  id: string;
  name: string;
  type: string;
  config: string;
  is_active: number;
  created_at: string;
}

// GET /api/data-sources
export async function GET() {
  try {
    const sources = dataSourceDb.getAll.all() as DataSource[];
    return NextResponse.json({ success: true, data: sources });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data sources' },
      { status: 500 }
    );
  }
}

// PUT /api/data-sources
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, config, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const existing = dataSourceDb.getById.get({ id }) as DataSource | undefined;
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data source not found' },
        { status: 404 }
      );
    }

    dataSourceDb.update.run({
      id,
      name: name || existing.name,
      config: config ? JSON.stringify(config) : existing.config,
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    });

    const updated = dataSourceDb.getById.get({ id }) as DataSource | undefined;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating data source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update data source' },
      { status: 500 }
    );
  }
}
