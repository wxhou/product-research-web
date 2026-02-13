/**
 * 面包屑导航组件
 *
 * 显示报告层级导航，支持章节下拉菜单和快速跳转
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface BreadcrumbNavProps {
  containerRef: React.RefObject<HTMLElement>;
  headings: Heading[];
  projectTitle: string;
  reportTitle?: string;
}

interface BreadcrumbItem {
  id: string;
  text: string;
  level: number;
}

export function BreadcrumbNav({
  containerRef,
  headings,
  projectTitle,
  reportTitle,
}: BreadcrumbNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 获取顶级标题 (h2) 作为导航项
  const mainSections = headings.filter((h) => h.level === 2);

  // 设置 IntersectionObserver 监听当前章节
  useEffect(() => {
    if (!containerRef.current || mainSections.length === 0) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
      }
    );

    mainSections.forEach((heading) => {
      const element = containerRef.current?.querySelector(`#${heading.id}`);
      if (element) {
        observer.observe(element);
      }
    });

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [containerRef, mainSections]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 滚动到指定章节
  const scrollToSection = useCallback(
    (id: string) => {
      const element = containerRef.current?.querySelector(`#${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
        setIsDropdownOpen(false);
      }
    },
    [containerRef]
  );

  // 获取当前活动章节标题
  const getActiveSectionTitle = () => {
    if (!activeSection) {
      return mainSections[0]?.text || reportTitle || projectTitle;
    }
    const activeHeading = headings.find((h) => h.id === activeSection);
    return activeHeading?.text || reportTitle || projectTitle;
  };

  // 只在有多个章节时显示
  if (mainSections.length < 2) {
    return null;
  }

  const currentTitle = getActiveSectionTitle();

  return (
    <nav className="breadcrumb-nav">
      <div className="breadcrumb-container">
        {/* 返回项目链接 */}
        <a href="/projects" className="breadcrumb-home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          项目
        </a>

        <span className="breadcrumb-separator">/</span>

        {/* 当前报告标题 */}
        <span className="breadcrumb-report">{projectTitle}</span>

        <span className="breadcrumb-separator">/</span>

        {/* 当前章节下拉菜单 */}
        <div className="breadcrumb-dropdown" ref={dropdownRef}>
          <button
            className="breadcrumb-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <span className="breadcrumb-current">{currentTitle}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isDropdownOpen && (
            <ul className="breadcrumb-dropdown-menu" role="listbox">
              {mainSections.map((heading) => (
                <li
                  key={heading.id}
                  className={`dropdown-item ${activeSection === heading.id ? 'active' : ''}`}
                  role="option"
                  aria-selected={activeSection === heading.id}
                >
                  <button onClick={() => scrollToSection(heading.id)}>
                    {heading.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        .breadcrumb-nav {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          background: var(--background-primary);
          border-bottom: 1px solid var(--border);
          z-index: 99;
          padding: 0.75rem 2rem;
        }

        .breadcrumb-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .breadcrumb-home {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--foreground-muted);
          text-decoration: none;
          font-size: 14px;
          padding: 0.375rem 0.625rem;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .breadcrumb-home:hover {
          color: var(--foreground);
          background: var(--background-subtle);
        }

        .breadcrumb-separator {
          color: var(--border);
          font-size: 14px;
        }

        .breadcrumb-report {
          color: var(--foreground-muted);
          font-size: 14px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .breadcrumb-dropdown {
          position: relative;
        }

        .breadcrumb-dropdown-trigger {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: var(--background-subtle);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--foreground);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .breadcrumb-dropdown-trigger:hover {
          background: var(--background-secondary);
          border-color: var(--foreground-muted);
        }

        .breadcrumb-current {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-arrow {
          transition: transform 0.2s;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .breadcrumb-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 280px;
          max-height: 320px;
          overflow-y: auto;
          background: var(--background-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          list-style: none;
          margin: 0;
          padding: 0.5rem;
          z-index: 100;
        }

        .dropdown-item {
          margin: 0;
          padding: 0;
        }

        .dropdown-item button {
          width: 100%;
          text-align: left;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--foreground);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-item button:hover {
          background: var(--background-subtle);
        }

        .dropdown-item.active button {
          background: var(--primary-light);
          color: var(--primary);
        }

        @media print {
          .breadcrumb-nav {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .breadcrumb-nav {
            padding: 0.5rem 1rem;
          }

          .breadcrumb-report {
            display: none;
          }

          .breadcrumb-current {
            max-width: 150px;
          }
        }
      `}</style>
    </nav>
  );
}

export default BreadcrumbNav;
