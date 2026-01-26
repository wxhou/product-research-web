'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Markdown from 'react-markdown';
import mermaid from 'mermaid';

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
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
  }, []);

  useEffect(() => {
    // Render mermaid charts when content changes
    if (report?.mermaid_charts && mermaidRef.current) {
      renderMermaidCharts();
    }
  }, [report, mermaidRef.current]);

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

  const renderMermaidCharts = async () => {
    if (!mermaidRef.current || !report?.mermaid_charts) return;

    try {
      const charts = JSON.parse(report.mermaid_charts || '[]');
      mermaidRef.current.innerHTML = '';

      for (const chart of charts) {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'mermaid-chart';
        chartDiv.innerHTML = `\`\`\`mermaid\n${chart.content}\n\`\`\``;
        mermaidRef.current.appendChild(chartDiv);
      }

      // Render all mermaid charts
      await mermaid.run({
        nodes: mermaidRef.current.querySelectorAll('.mermaid-chart'),
      });
    } catch (error) {
      console.error('Failed to render mermaid charts:', error);
    }
  };

  const handleCopyMarkdown = async () => {
    if (report) {
      await navigator.clipboard.writeText(report.content);
      alert('已复制到剪贴板');
    }
  };

  const handleSaveToFile = async () => {
    if (!report) return;

    setSaving(true);
    try {
      // 创建 Blob 并下载
      const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `产品调研-${report.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-${new Date().toISOString().slice(0, 10)}.md`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`报告已保存到: ${fileName}`);
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
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

  // Custom renderer for markdown components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: any = {
    h1: ({ children }: { children: React.ReactNode }) => <h1 className="report-h1">{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 className="report-h2">{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="report-h3">{children}</h3>,
    h4: ({ children }: { children: React.ReactNode }) => <h4 className="report-h4">{children}</h4>,
    p: ({ children }: { children: React.ReactNode }) => <p className="report-p">{children}</p>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="report-ul">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="report-ol">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="report-li">{children}</li>,
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="report-blockquote">{children}</blockquote>
    ),
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      return isInline ? (
        <code className="code-inline">{children}</code>
      ) : (
        <code className={`code-block ${className}`}>{children}</code>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => <pre className="code-pre">{children}</pre>,
    hr: () => <hr className="report-hr" />,
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="table-wrapper">{children}</div>
    ),
    tr: ({ children }: { children: React.ReactNode }) => <tr className="table-row">{children}</tr>,
    th: ({ children }: { children: React.ReactNode }) => <th className="table-cell table-header">{children}</th>,
    td: ({ children }: { children: React.ReactNode }) => <td className="table-cell">{children}</td>,
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
          <button className="btn btn-secondary" onClick={handleCopyMarkdown}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            复制 Markdown
          </button>
          <button className="btn btn-primary" onClick={handleSaveToFile} disabled={saving}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {saving ? '保存中...' : '保存到文件'}
          </button>
        </div>
      </header>

      <article className="report-content">
        <div className="report-body">
          <Markdown components={components}>{report.content}</Markdown>
        </div>

        {/* Mermaid Charts */}
        <div ref={mermaidRef} className="mermaid-container" />
      </article>

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

        .report-content {
          min-width: 0;
        }

        .report-body {
          background: var(--background-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
        }

        .report-body :global(.report-h1) {
          font-size: 1.75rem;
          margin: 2rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .report-body :global(.report-h1:first-child) {
          margin-top: 0;
          border-bottom: none;
        }

        .report-body :global(.report-h2) {
          font-size: 1.375rem;
          margin: 2rem 0 1rem;
        }

        .report-body :global(.report-h3) {
          font-size: 1.125rem;
          margin: 1.5rem 0 0.75rem;
          color: var(--foreground-secondary);
        }

        .report-body :global(.report-h4) {
          font-size: 1rem;
          margin: 1.25rem 0 0.5rem;
        }

        .report-body :global(.report-p) {
          color: var(--foreground-secondary);
          line-height: 1.8;
          margin: 0.75rem 0;
        }

        .report-body :global(.report-blockquote) {
          margin: 1rem 0;
          padding: 1rem 1.5rem;
          background: var(--background-subtle);
          border-left: 4px solid var(--color-primary);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          color: var(--foreground-secondary);
        }

        .report-body :global(.report-ul),
        .report-body :global(.report-ol) {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .report-body :global(.report-li) {
          color: var(--foreground-secondary);
          line-height: 1.8;
          margin: 0.5rem 0;
        }

        .report-body :global(.code-inline) {
          background: var(--background-subtle);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.875em;
        }

        .report-body :global(.code-pre) {
          background: var(--background-subtle);
          border-radius: var(--radius-md);
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .report-body :global(.code-block) {
          display: block;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.875rem;
          color: var(--foreground);
        }

        .report-body :global(.report-hr) {
          margin: 2rem 0;
          border: none;
          border-top: 1px solid var(--border-light);
        }

        .report-body :global(.table-wrapper) {
          overflow-x: auto;
          margin: 1rem 0;
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

        .report-body :global(.table-header) {
          font-weight: 600;
          color: var(--foreground);
        }

        .mermaid-container {
          margin-top: 2rem;
        }

        .mermaid-container :global(.mermaid-chart) {
          margin: 1rem 0;
          text-align: center;
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
