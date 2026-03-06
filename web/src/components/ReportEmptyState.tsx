/**
 * 空状态组件
 *
 * 用于报告不存在或已删除时的展示
 */

'use client';

import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  illustration?: React.ReactNode;
}

export function EmptyState({
  title = '报告不存在',
  message = '您访问的报告可能已被删除',
  actionLabel = '返回项目列表',
  actionHref = '/projects',
  illustration,
}: EmptyStateProps) {
  return (
    <div className="empty-state-container">
      <div className="empty-state card">
        <div className="empty-icon">
          {illustration || (
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          )}
        </div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-message">{message}</p>
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      </div>

      <style jsx>{`
        .empty-state-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
          padding: 2rem;
        }

        .empty-state {
          text-align: center;
          max-width: 400px;
          padding: 3rem 2rem;
        }

        .empty-icon {
          color: var(--foreground-muted);
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: center;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--foreground);
          margin: 0 0 0.75rem 0;
        }

        .empty-message {
          color: var(--foreground-muted);
          margin: 0 0 1.5rem 0;
          font-size: 0.9375rem;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

// 加载状态组件
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = '加载中...' }: LoadingStateProps) {
  return (
    <div className="loading-state-container">
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>{message}</p>
      </div>

      <style jsx>{`
        .loading-state-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }

        .loading-state {
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          margin: 0 auto 1rem;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-state p {
          color: var(--foreground-muted);
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

export default EmptyState;
