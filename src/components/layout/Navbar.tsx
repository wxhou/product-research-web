'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/projects', label: '项目', icon: 'folder' },
  { href: '/reports', label: '报告', icon: 'file' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          <ThemeToggle />
          {!loading && isAuthenticated && (
            <div className="user-menu-wrapper">
              <button
                className="user-badge"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {user?.username}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-user-info">
                    <span className="dropdown-username">{user?.username}</span>
                    {isAdmin && <span className="dropdown-admin-tag">管理员</span>}
                  </div>
                  <button
                    className="dropdown-item logout-btn"
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    退出登录
                  </button>
                </div>
              )}
            </div>
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
