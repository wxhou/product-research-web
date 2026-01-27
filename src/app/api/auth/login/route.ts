import { NextRequest, NextResponse } from 'next/server';
import { userDb, settingsDb } from '@/lib/db';
import crypto from 'crypto';

// 简单密码 hash 函数（与 db/index.ts 保持一致）
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth/login - 管理员登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 输入验证
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // 查找用户
    const user = userDb.getByUsername.get({ username: trimmedUsername }) as {
      id: string;
      username: string;
      password_hash: string | null;
      role: string;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 验证密码
    const passwordHash = hashPassword(password);
    if (user.password_hash && user.password_hash !== passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
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
    console.error('Error logging in:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to login' },
      { status: 500 }
    );
  }
}
