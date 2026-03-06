import { NextRequest, NextResponse } from 'next/server';

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
