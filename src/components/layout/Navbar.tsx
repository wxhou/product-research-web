'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/projects', label: '项目', icon: 'folder' },
  { href: '/reports', label: '报告', icon: 'file' },
  { href: '/settings', label: '设置', icon: 'settings' },
];

export default function Navbar() {
  const pathname = usePathname();

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
        </nav>

        <div className="navbar-actions">
          <button className="action-btn" aria-label="通知">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="avatar">
            <span>P</span>
          </div>
        </div>
      </div>
    </header>
  );
}
