"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'highlight.js/styles/github-dark.css';

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

    // Find all mermaid code blocks in various formats
    const mermaidBlocks: { element: HTMLElement; code: string }[] = [];

    // 1. Find code blocks with class "mermaid" or "language-mermaid"
    const codeElements = containerRef.current.querySelectorAll('code[class*="mermaid"], code[class*="language-mermaid"]');
    codeElements.forEach((codeEl) => {
      const preEl = codeEl.closest('pre');
      if (preEl) {
        let code = codeEl.textContent || '';
        // Remove "mermaid" prefix if present
        code = code.replace(/^mermaid\s*/i, '').trim();
        mermaidBlocks.push({ element: preEl as HTMLElement, code });
      }
    });

    // 2. Find pre.mermaid elements (raw HTML format)
    const preMermaidElements = containerRef.current.querySelectorAll('pre.mermaid');
    preMermaidElements.forEach((preEl) => {
      let code = preEl.textContent || '';
      // Check if it contains a mermaid div inside
      const mermaidDiv = preEl.querySelector('div.mermaid');
      if (mermaidDiv) {
        code = mermaidDiv.textContent || '';
      }
      code = code.replace(/^mermaid\s*/i, '').trim();
      if (code) {
        mermaidBlocks.push({ element: preEl as HTMLElement, code });
      }
    });

    // 3. Find div.mermaid elements directly
    const mermaidDivs = containerRef.current.querySelectorAll('div.mermaid');
    mermaidDivs.forEach((divEl) => {
      const preEl = divEl.closest('pre');
      if (preEl) {
        // This mermaid div might already be processed, skip
        return;
      }
      let code = divEl.textContent || '';
      code = code.replace(/^mermaid\s*/i, '').trim();
      if (code) {
        mermaidBlocks.push({ element: divEl as HTMLElement, code });
      }
    });

    if (mermaidBlocks.length === 0) return;

    // Create unique IDs for each diagram
    const chartElements: HTMLElement[] = [];

    mermaidBlocks.forEach(({ element, code }, index) => {
      const chartId = `mermaid-chart-${reportId}-${Date.now()}-${index}`;

      // Create a new container for the chart
      const chartContainer = document.createElement('div');
      chartContainer.className = 'mermaid-chart';
      chartContainer.id = chartId;
      chartContainer.textContent = code;

      // Replace the original element with the chart container
      element.replaceWith(chartContainer);
      chartElements.push(chartContainer);
    });

    // Use mermaid.run() for async rendering
    try {
      await mermaid.run({
        nodes: chartElements,
        suppressErrors: true,
      });
    } catch (error) {
      console.error('mermaid.run failed:', error);
      // Fallback: show error message
      chartElements.forEach((el, index) => {
        el.innerHTML = `<div class="mermaid-error" style="padding: 1rem; background: #fee2e2; border-radius: 8px; color: #dc2626;">
          <strong>图表渲染失败</strong>
          <pre style="margin: 0.5rem 0 0; font-size: 0.75rem; overflow-x: auto;">${el.textContent}</pre>
        </div>`;
      });
    }
  }, [reportId]);

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
    h1: (props: React.ComponentPropsWithoutRef<'h1'>) => <h1 className="report-h1">{props.children}</h1>,
    h2: (props: React.ComponentPropsWithoutRef<'h2'>) => <h2 className="report-h2">{props.children}</h2>,
    h3: (props: React.ComponentPropsWithoutRef<'h3'>) => <h3 className="report-h3">{props.children}</h3>,
    h4: (props: React.ComponentPropsWithoutRef<'h4'>) => <h4 className="report-h4">{props.children}</h4>,
    p: (props: React.ComponentPropsWithoutRef<'p'>) => <p className="report-p">{props.children}</p>,
    ul: (props: React.ComponentPropsWithoutRef<'ul'>) => <ul className="report-ul">{props.children}</ul>,
    ol: (props: React.ComponentPropsWithoutRef<'ol'>) => <ol className="report-ol">{props.children}</ol>,
    li: (props: React.ComponentPropsWithoutRef<'li'>) => <li className="report-li">{props.children}</li>,
    blockquote: (props: React.ComponentPropsWithoutRef<'blockquote'>) => <blockquote className="report-blockquote">{props.children}</blockquote>,
    code: (props: React.ComponentPropsWithoutRef<'code'>) => {
      const { className, children } = props;
      const isInline = !className;
      if (isInline) return <code className="code-inline">{children}</code>;
      return <code className={`code-block ${className || ''}`}>{children}</code>;
    },
    pre: (props: React.ComponentPropsWithoutRef<'pre'>) => {
      const { children } = props;
      let hasMermaid = false;
      if (children && typeof children === 'object' && 'props' in children) {
        const childProps = children.props as { className?: string };
        const className = childProps?.className || '';
        hasMermaid = !!(className.includes('mermaid') || className.includes('language-mermaid'));
      }
      return <pre className={hasMermaid ? 'code-pre mermaid-original' : 'code-pre'}>{children}</pre>;
    },
    hr: () => <hr className="report-hr" />,
    table: (props: React.ComponentPropsWithoutRef<'table'>) => (
      <div className="table-wrapper">
        <table>{props.children}</table>
      </div>
    ),
    thead: (props: React.ComponentPropsWithoutRef<'thead'>) => <thead>{props.children}</thead>,
    tbody: (props: React.ComponentPropsWithoutRef<'tbody'>) => <tbody>{props.children}</tbody>,
    tr: (props: React.ComponentPropsWithoutRef<'tr'>) => <tr className="table-row">{props.children}</tr>,
    th: (props: React.ComponentPropsWithoutRef<'th'>) => <th className="table-cell table-header">{props.children}</th>,
    td: (props: React.ComponentPropsWithoutRef<'td'>) => <td className="table-cell">{props.children}</td>,
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
          <Markdown components={components} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{report.content}</Markdown>
        </div>
      </article>
    </div>
  );
}
