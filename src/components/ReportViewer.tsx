"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export default function ReportViewer({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const renderedChartsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      xychart: { theme: 'base' },
    });
  }, []);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports?id=${reportId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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

  useEffect(() => {
    if (reportId) fetchReport();
  }, [reportId]);

  const processMermaidBlocks = useCallback(async () => {
    if (!containerRef.current) return;
    const preElements = containerRef.current.querySelectorAll('pre');
    const chartConfigs: { id: string; code: string }[] = [];

    for (let i = 0; i < preElements.length; i++) {
      const preEl = preElements[i];
      const codeEl = preEl.querySelector('code');
      if (!codeEl) continue;
      const className = codeEl.className || '';
      if (!className.includes('mermaid') && !className.includes('language-mermaid')) continue;
      let code = codeEl.textContent || '';
      code = code.replace(/<pre\s+class\s*=\s*["']mermaid["']>[\s\S]*?<\/pre>/gi, '');
      code = code.replace(/<pre class=mermaid>[\s\S]*?<\/pre>/gi, '');
      code = code.trim();
      if (code.startsWith('mermaid')) code = code.substring('mermaid'.length).trim();
      if (!code) continue;

      const hash = code.slice(0, 100);
      if (renderedChartsRef.current.has(hash)) continue;

      // Create a mermaid container div and set its text to the diagram source
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = code;

      // Replace the pre element with the mermaid div
      preEl.replaceWith(mermaidDiv);

      // mark for initialization
      renderedChartsRef.current.add(hash);
    }

    // Initialize mermaid on any newly added .mermaid elements inside the container
    try {
      const elems = containerRef.current.querySelectorAll('.mermaid');
      if (elems.length > 0) {
        mermaid.init(undefined, Array.from(elems) as HTMLElement[]);
      }
    } catch (error) {
      console.error('mermaid.init failed:', error);
      // fallback: render raw code blocks inside a wrapper
      const elems = containerRef.current.querySelectorAll('.mermaid');
      elems.forEach((el) => {
        const text = (el.textContent || '').trim();
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-error';
        wrapper.innerHTML = `<pre class="mermaid">${text}</pre>`;
        el.replaceWith(wrapper);
      });
    }
  }, []);

  useEffect(() => {
    if (!loading && report) {
      const timer = setTimeout(() => processMermaidBlocks(), 200);
      return () => clearTimeout(timer);
    }
  }, [loading, report, processMermaidBlocks]);

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
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const components = {
    h1: ({ children }: { children: React.ReactNode }) => <h1 className="report-h1">{children}</h1>,
    h2: ({ children }: { children: React.ReactNode }) => <h2 className="report-h2">{children}</h2>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="report-h3">{children}</h3>,
    h4: ({ children }: { children: React.ReactNode }) => <h4 className="report-h4">{children}</h4>,
    p: ({ children }: { children: React.ReactNode }) => <p className="report-p">{children}</p>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="report-ul">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="report-ol">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="report-li">{children}</li>,
    blockquote: ({ children }: { children: React.ReactNode }) => <blockquote className="report-blockquote">{children}</blockquote>,
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      const isInline = !className;
      if (isInline) return <code className="code-inline">{children}</code>;
      if (className && (className.includes('mermaid') || className.includes('language-mermaid'))) return <code className={className}>{children}</code>;
      return <code className={`code-block ${className}`}>{children}</code>;
    },
    pre: ({ children }: { children: React.ReactNode }) => {
      const codeEl = children as React.ReactElement;
      if (codeEl?.props?.className?.includes('mermaid') || codeEl?.props?.className?.includes('language-mermaid')) {
        return <pre className="code-pre">{children}</pre>;
      }
      return <pre className="code-pre">{children}</pre>;
    },
    hr: () => <hr className="report-hr" />,
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="table-wrapper">
        <table>{children}</table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
    tbody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children: React.ReactNode }) => <tr className="table-row">{children}</tr>,
    th: ({ children }: { children: React.ReactNode }) => <th className="table-cell table-header">{children}</th>,
    td: ({ children }: { children: React.ReactNode }) => <td className="table-cell">{children}</td>,
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!report || !project) {
    return (
      <div className="report-page">
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <h3>报告不存在</h3>
          <p>您访问的报告可能已被删除</p>
          <Link href="/projects" className="btn btn-primary">返回项目列表</Link>
        </div>
      </div>
    );
  }

  const keywords = JSON.parse(project.keywords || '[]');

  return (
    <div className="report-page">
      <header className="page-header">
        <Link href={`/projects?id=${project.id}`} className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回项目
        </Link>

        <div className="header-main">
          <h1>{project.title}</h1>
          <div className="header-meta">
            <span className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {formatDate(report.created_at)}
            </span>
            {keywords.length > 0 && (
              <span className="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <path d="M7 7h.01" />
                </svg>
                {keywords.join(', ')}
              </span>
            )}
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
        <div ref={containerRef} className="report-body">
          <Markdown components={components} remarkPlugins={[remarkGfm]}>{report.content}</Markdown>
        </div>
      </article>
    </div>
  );
}
