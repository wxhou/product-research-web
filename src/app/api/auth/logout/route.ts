import { NextRequest, NextResponse } from 'next/server';
import { settingsDb, default as db } from '@/lib/db';

// POST /api/auth/logout - 登出
export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('auth_token')?.value;

  if (sessionToken) {
    // 删除会话
    try {
      db.prepare("DELETE FROM user_settings WHERE key = ?").run(`session_${sessionToken}`);
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('auth_token');
  return response;
}
