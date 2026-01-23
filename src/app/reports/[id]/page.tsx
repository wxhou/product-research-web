'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Report {
  id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  keywords: string;
}

export default function ReportPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data.report);
        setProject(data.data.project);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if (report) {
      await navigator.clipboard.writeText(report.content);
      alert('已复制到剪贴板');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="loading">加载中...</div>
        <style jsx>{`
          .loading {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--foreground-muted);
          }
        `}</style>
      </div>
    );
  }

  if (!report || !project) {
    return (
      <div className="report-page">
        <div className="empty-state">
          <p>报告不存在</p>
          <Link href="/projects" className="btn btn-primary">
            返回项目列表
          </Link>
        </div>
        <style jsx>{`
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
          }
          .empty-state p {
            margin-bottom: 1rem;
            color: var(--foreground-muted);
          }
        `}</style>
      </div>
    );
  }

  const keywords = JSON.parse(project.keywords || '[]');

  return (
    <div className="report-page">
      <header className="page-header">
        <Link href="/projects" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回项目
        </Link>

        <div className="header-main">
          <h1>{project.title}</h1>
          <div className="header-meta">
            <span>{formatDate(report.created_at)}</span>
            <span>·</span>
            <span>{keywords.length > 0 ? keywords.join(', ') : '产品调研'}</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            导出 PDF
          </button>
          <button className="btn btn-secondary" onClick={handleCopyMarkdown}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            复制 Markdown
          </button>
        </div>
      </header>

      <div className="report-layout">
        <article className="report-content">
          <div className="report-body">
            {/* 渲染 Markdown 内容 */}
            {report.content.split('\n').map((line, index) => {
              // 处理标题
              if (line.startsWith('# ')) {
                return <h1 key={index}>{line.substring(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={index}>{line.substring(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={index}>{line.substring(4)}</h3>;
              }
              if (line.startsWith('#### ')) {
                return <h4 key={index}>{line.substring(5)}</h4>;
              }
              // 处理引用
              if (line.startsWith('> ')) {
                return <blockquote key={index}>{line.substring(2)}</blockquote>;
              }
              // 处理列表
              if (line.startsWith('- ')) {
                return <li key={index}>{line.substring(2)}</li>;
              }
              // 处理有序列表
              if (/^\d+\. /.test(line)) {
                return <li key={index}>{line.replace(/^\d+\. /, '')}</li>;
              }
              // 处理粗体
              if (line.includes('**')) {
                const parts = line.split('**');
                return (
                  <p key={index}>
                    {parts.map((part, i) =>
                      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                    )}
                  </p>
                );
              }
              // 处理代码块
              if (line.startsWith('```')) {
                return null; // 跳过代码块标记，实际渲染时需要特殊处理
              }
              // 处理行内代码
              if (line.includes('`')) {
                const parts = line.split('`');
                return (
                  <p key={index}>
                    {parts.map((part, i) =>
                      i % 2 === 1 ? <code key={i}>{part}</code> : part
                    )}
                  </p>
                );
              }
              // 处理分隔线
              if (line.startsWith('---')) {
                return <hr key={index} />;
              }
              // 处理表格行
              if (line.startsWith('|')) {
                if (line.includes('---')) {
                  return null; // 跳过表格分隔行
                }
                const cells = line.split('|').filter((c: string) => c.trim());
                if (cells[0]?.includes('调研产品数')) {
                  // 这是概览表格
                  return null;
                }
                return (
                  <div key={index} className="table-row">
                    {cells.map((cell: string, i: number) => (
                      <span key={i} className="table-cell">{cell.trim()}</span>
                    ))}
                  </div>
                );
              }
              // 空行
              if (line.trim() === '') {
                return <br key={index} />;
              }
              // 普通段落
              return <p key={index}>{line}</p>;
            })}
          </div>
        </article>
      </div>

      <style jsx>{`
        .report-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--foreground-secondary);
          margin-bottom: 1rem;
        }

        .back-link:hover {
          color: var(--color-primary);
        }

        .header-main {
          margin-bottom: 1.5rem;
        }

        .header-main h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--foreground-secondary);
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .report-layout {
          display: block;
        }

        .report-content {
          min-width: 0;
        }

        .report-body {
          background: var(--background-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
        }

        .report-body :global(h1) {
          font-size: 1.75rem;
          margin: 2rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .report-body :global(h1:first-child) {
          margin-top: 0;
          border-bottom: none;
        }

        .report-body :global(h2) {
          font-size: 1.375rem;
          margin: 2rem 0 1rem;
        }

        .report-body :global(h3) {
          font-size: 1.125rem;
          margin: 1.5rem 0 0.75rem;
          color: var(--foreground-secondary);
        }

        .report-body :global(h4) {
          font-size: 1rem;
          margin: 1.25rem 0 0.5rem;
        }

        .report-body :global(p) {
          color: var(--foreground-secondary);
          line-height: 1.8;
          margin: 0.75rem 0;
        }

        .report-body :global(blockquote) {
          margin: 1rem 0;
          padding: 1rem 1.5rem;
          background: var(--background-subtle);
          border-left: 4px solid var(--color-primary);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          color: var(--foreground-secondary);
        }

        .report-body :global(li) {
          color: var(--foreground-secondary);
          line-height: 1.8;
          margin: 0.5rem 0 0.5rem 1.5rem;
        }

        .report-body :global(code) {
          background: var(--background-subtle);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.875em;
        }

        .report-body :global(hr) {
          margin: 2rem 0;
          border: none;
          border-top: 1px solid var(--border-light);
        }

        .report-body :global(.table-row) {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.5rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border-light);
        }

        .report-body :global(.table-cell) {
          font-size: 0.875rem;
          color: var(--foreground-secondary);
        }

        .loading, .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--foreground-muted);
        }

        @media (max-width: 768px) {
          .header-actions {
            flex-wrap: wrap;
          }

          .report-body {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
