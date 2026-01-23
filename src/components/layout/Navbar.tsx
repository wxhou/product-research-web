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
      <div className="navbar-inner">
        <Link href="/" className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <span>Product Research</span>
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
          <button className="btn-icon" aria-label="通知">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="avatar">
            <span>U</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(253, 251, 247, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-light);
        }

        .navbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--foreground);
          text-decoration: none;
        }

        .logo svg {
          color: var(--color-primary);
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .nav-link {
          padding: 0.5rem 1rem;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--foreground-secondary);
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .nav-link:hover {
          color: var(--foreground);
          background: var(--background-subtle);
        }

        .nav-link.active {
          color: var(--color-primary);
          background: var(--color-primary-light);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .btn-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--foreground-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-icon:hover {
          background: var(--background-subtle);
          color: var(--foreground);
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
