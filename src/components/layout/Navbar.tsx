'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/projects', label: '项目', icon: 'folder' },
  { href: '/reports', label: '报告', icon: 'file' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link href="/" className="logo">
          <svg className="logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="logo-text">Product Research</span>
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
          {/* 只有管理员才能看到设置链接 */}
          {isAdmin && (
            <Link
              href="/settings"
              className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}
            >
              设置
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          {!loading && isAuthenticated && (
            <>
              <span className="user-badge">
                {isAdmin && <span className="admin-tag">Admin</span>}
                {user?.username}
              </span>
              <button
                className="action-btn logout-btn"
                onClick={() => logout()}
                aria-label="登出"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          )}
          {!loading && !isAuthenticated && (
            <Link href="/auth" className="btn btn-primary btn-sm">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
