/**
 * 目录导航组件
 *
 * 显示报告的章节目录，支持滚动监听和高亮
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  containerRef: React.RefObject<HTMLElement>;
  headings: Heading[];
}

export function TableOfContents({ containerRef, headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置 IntersectionObserver 监听标题
  useEffect(() => {
    if (!containerRef.current || headings.length === 0) {
      setIsVisible(false);
      return;
    }

    // 清理旧的 observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px',
        threshold: 0,
      }
    );

    // 监听所有标题
    headings.forEach((heading) => {
      const element = containerRef.current?.querySelector(`#${heading.id}`);
      if (element) {
        observer.observe(element);
      }
    });

    observerRef.current = observer;
    setIsVisible(true);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, headings]);

  // 点击跳转到对应章节
  const handleClick = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = containerRef.current?.querySelector(`#${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 点击后立即设置 active，避免等待 observer
      setActiveId(id);
    }
  }, [containerRef]);

  // 只在报告内容超过 3 个标题时才显示
  if (headings.length < 4 || !isVisible) {
    return null;
  }

  return (
    <aside className="toc-sidebar">
      <nav className="toc-nav">
        <h4 className="toc-title">目录</h4>
        <ul className="toc-list">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={`toc-item toc-level-${heading.level} ${activeId === heading.id ? 'active' : ''}`}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(heading.id, e)}
                title={heading.text}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <style jsx>{`
        .toc-sidebar {
          position: fixed;
          top: 128px;
          right: 2rem;
          width: 240px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          background: var(--background-primary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1rem;
          z-index: 100;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .toc-nav {
          position: sticky;
          top: 0;
        }

        .toc-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--foreground-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 0.75rem 0;
          padding: 0 0.5rem;
        }

        .toc-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .toc-item {
          margin: 0;
          padding: 0;
        }

        .toc-item a {
          display: block;
          padding: 0.5rem;
          font-size: 14px;
          color: var(--foreground-muted);
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.2s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .toc-item a:hover {
          color: var(--foreground);
          background: var(--background-subtle);
        }

        .toc-item.active a {
          color: var(--primary);
          background: var(--primary-light);
          font-weight: 500;
        }

        .toc-level-2 {
          padding-left: 0.5rem;
        }

        .toc-level-3 {
          padding-left: 1rem;
          font-size: 13px;
        }

        .toc-level-4 {
          padding-left: 1.5rem;
          font-size: 12px;
        }

        @media print {
          .toc-sidebar {
            display: none;
          }
        }

        @media (max-width: 1200px) {
          .toc-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}

export default TableOfContents;
