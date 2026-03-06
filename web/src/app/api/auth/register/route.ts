import { NextRequest, NextResponse } from 'next/server';
import { userDb, settingsDb } from '@/lib/db';
import crypto from 'crypto';

// POST /api/auth/register - 注册普通用户（用户名不存在则创建，已存在则直接登录）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // 输入验证
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Username must be 2-50 characters' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existing = userDb.getByUsername.get({ username: trimmedUsername }) as {
      id: string;
      username: string;
      role: string;
    } | undefined;

    let user: { id: string; username: string; role: string };

    if (existing) {
      // 用户已存在，直接使用
      user = existing;
    } else {
      // 创建新用户
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      userDb.create.run({
        id,
        username: trimmedUsername,
        password_hash: null,
        role: 'user',
      });
      user = { id, username: trimmedUsername, role: 'user' };
    }

    // 创建会话
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // 保存会话到数据库（7天过期）
    settingsDb.set.run({
      key: `session_${sessionToken}`,
      value: JSON.stringify(sessionData),
    });

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, username: user.username, role: user.role },
    });

    // 设置 Cookie
    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
