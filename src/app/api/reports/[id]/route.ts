import { NextRequest, NextResponse } from 'next/server';
import { projectDb, reportDb, searchResultDb } from '@/lib/db';

interface Report {
  id: string;
  project_id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  version: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  keywords: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  project_id: string;
  source: string;
  query: string;
  url: string;
  title: string;
  content: string;
  raw_data: string;
  created_at: string;
}

// Redirect compatibility: forward path-based requests to the new query-based route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = '/api/reports';
  url.searchParams.set('id', id);
  return NextResponse.redirect(url.toString(), 307);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = '/api/reports';
  url.searchParams.set('id', id);
  return NextResponse.redirect(url.toString(), 307);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  url.pathname = '/api/reports';
  url.searchParams.set('id', id);
  return NextResponse.redirect(url.toString(), 307);
}
