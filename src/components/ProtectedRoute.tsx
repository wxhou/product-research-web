'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = false,
  requireAdmin = false,
  redirectTo = '/auth',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      // 未登录，重定向到登录页
      router.replace(`${redirectTo}?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireAdmin && !isAdmin) {
      // 非管理员，重定向到首页
      router.replace('/');
      return;
    }
  }, [loading, isAuthenticated, isAdmin, requireAuth, requireAdmin, redirectTo, router, pathname]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  // 权限不满足时不渲染内容
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
