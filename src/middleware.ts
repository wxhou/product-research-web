import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 不需要认证的路径
const publicPaths = ['/auth', '/api/auth'];

// 检查路径是否以指定前缀开头
function startsWith(path: string, prefixes: string[]): boolean {
  return prefixes.some(prefix => path.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径不需要检查
  if (startsWith(pathname, publicPaths)) {
    return NextResponse.next();
  }

  // 获取认证 cookie
  const authToken = request.cookies.get('auth_token');

  // 未登录且访问非公开路径，重定向到登录页
  if (!authToken) {
    const loginUrl = new URL('/auth', request.url);
    // 保存原始路径，登录后可以跳转回去（可选）
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - api 路由（API 调用需要单独处理）
     * - _next 静态资源
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
