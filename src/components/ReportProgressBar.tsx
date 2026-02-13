/**
 * 阅读进度条组件
 *
 * 显示用户在报告中的阅读进度
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

interface ReadingProgressProps {
  containerRef: React.RefObject<HTMLElement>;
}

export function ReadingProgress({ containerRef }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  const calculateProgress = useCallback(() => {
    if (!containerRef.current) return 0;

    const element = containerRef.current;
    const rect = element.getBoundingClientRect();
    const elementHeight = element.clientHeight;
    const viewportHeight = window.innerHeight;
    const scrollTop = window.scrollY;
    const elementTop = rect.top + scrollTop;

    // 计算滚动百分比
    const scrollHeight = document.documentElement.scrollHeight - viewportHeight;
    const scrollPosition = scrollTop;

    if (scrollHeight <= 0) return 0;

    const percent = Math.min(100, Math.max(0, (scrollPosition / scrollHeight) * 100));
    return Math.round(percent);
  }, [containerRef]);

  useEffect(() => {
    const handleScroll = () => {
      setProgress(calculateProgress());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // 初始化时计算一次
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [calculateProgress]);

  // 只在有进度变化时更新，避免不必要的渲染
  const displayProgress = progress;

  return (
    <div className="reading-progress-container">
      <div
        className="reading-progress-bar"
        style={{ width: `${displayProgress}%` }}
        role="progressbar"
        aria-valuenow={displayProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="阅读进度"
      >
        <span className="progress-percentage">{displayProgress}%</span>
      </div>
      <style jsx>{`
        .reading-progress-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: var(--background-subtle);
          z-index: 1000;
        }

        .reading-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--primary-light));
          transition: width 0.1s ease-out;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .progress-percentage {
          font-size: 10px;
          color: var(--primary);
          margin-right: 8px;
          font-weight: 500;
          white-space: nowrap;
        }

        @media print {
          .reading-progress-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default ReadingProgress;
