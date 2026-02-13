"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import mermaid from 'mermaid';
import 'highlight.js/styles/github-dark.css';

// Import new components
import { TableOfContents } from './ReportTableOfContents';
import { ReadingProgress } from './ReportProgressBar';
import { ChartModal } from './ChartModal';
import { BreadcrumbNav } from './ReportBreadcrumbNav';
import { EmptyState, LoadingState } from './ReportEmptyState';

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

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function ReportViewer({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    chartContent: React.ReactNode;
    chartId: string;
    chartCode: string;
  }>({
    isOpen: false,
    chartContent: null,
    chartId: '',
    chartCode: '',
  });

  // 初始化 mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
  }, []);

  // 获取报告数据
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

  // 提取标题用于 TOC
  const extractHeadings = useCallback(() => {
    if (!containerRef.current) return [];

    const headingElements = containerRef.current.querySelectorAll('h2, h3, h4');
    const extractedHeadings: Heading[] = [];

    headingElements.forEach((element, index) => {
      // 确保每个标题有唯一 ID
      if (!element.id) {
        element.id = `heading-${index}`;
      }

      const textContent = element.textContent || '';
      if (textContent) {
        extractedHeadings.push({
          id: element.id,
          text: textContent,
          level: parseInt(element.tagName.charAt(1), 10),
        });
      }
    });

    return extractedHeadings;
  }, []);

  // 处理 Mermaid 图表渲染
  const processMermaidBlocks = useCallback(async () => {
    if (!containerRef.current) return;

    // Pre-process: convert invalid mermaid syntax to valid
    const preprocessor = (content: string): string => {
      return content.replace(
        /```mermaid[\s\S]*?barChart[\s\S]*?title\s+["']([^"']+)["'][\s\S]*?x-axis\s+([^\n]+)[\s\S]*?y-axis\s+([^\n]+)[\s\S]*?series\s+([^\n]+)[\s\S]*?([\d\s,\[\]]+)[\s\S]*?```/g,
        (match, title, xaxis, yaxis, series, data) => {
          return `\`\`\`mermaid
xychart-beta
    title "${title.trim()}"
    x-axis ${xaxis.trim()}
    y-axis "${yaxis.trim()}"
    bar ${data.trim()}
\`\`\``;
        }
      );
    };

    // Apply preprocessor
    const codeBlocks = containerRef.current.querySelectorAll('code');
    codeBlocks.forEach((codeEl) => {
      if (codeEl.className.includes('mermaid') || codeEl.className.includes('language-mermaid')) {
        const originalText = codeEl.textContent || '';
        const convertedText = preprocessor(originalText);
        if (originalText !== convertedText) {
          codeEl.textContent = convertedText;
        }
      }
    });

    // Find all mermaid blocks
    const mermaidBlocks: { element: HTMLElement; code: string }[] = [];

    // Find code blocks with class "mermaid" or "language-mermaid"
    const codeElements = containerRef.current.querySelectorAll('code[class*="mermaid"], code[class*="language-mermaid"]');
    codeElements.forEach((codeEl) => {
      const preEl = codeEl.closest('pre');
      if (preEl) {
        let code = codeEl.textContent || '';
        code = code.replace(/^mermaid\s*/i, '').trim();
        mermaidBlocks.push({ element: preEl as HTMLElement, code });
      }
    });

    // Find pre.mermaid elements
    const preMermaidElements = containerRef.current.querySelectorAll('pre.mermaid');
    preMermaidElements.forEach((preEl) => {
      let code = preEl.textContent || '';
      const mermaidDiv = preEl.querySelector('div.mermaid');
      if (mermaidDiv) {
        code = mermaidDiv.textContent || '';
      }
      code = code.replace(/^mermaid\s*/i, '').trim();
      if (code) {
        mermaidBlocks.push({ element: preEl as HTMLElement, code });
      }
    });

    // Find div.mermaid elements
    const mermaidDivs = containerRef.current.querySelectorAll('div.mermaid');
    mermaidDivs.forEach((divEl) => {
      const preEl = divEl.closest('pre');
      if (preEl) return;
      let code = divEl.textContent || '';
      code = code.replace(/^mermaid\s*/i, '').trim();
      if (code) {
        mermaidBlocks.push({ element: divEl as HTMLElement, code });
      }
    });

    if (mermaidBlocks.length === 0) return;

    // Render mermaid charts
    const chartElements: HTMLElement[] = [];

    mermaidBlocks.forEach(({ element, code }, index) => {
      const chartId = `mermaid-chart-${reportId}-${Date.now()}-${index}`;

      const chartContainer = document.createElement('div');
      chartContainer.className = 'mermaid-chart';
      chartContainer.id = chartId;
      chartContainer.textContent = code;

      // 添加点击事件打开模态框
      chartContainer.style.cursor = 'pointer';
      chartContainer.onclick = () => {
        setModalState({
          isOpen: true,
          chartContent: null,
          chartId,
          chartCode: code,
        });
      };

      element.replaceWith(chartContainer);
      chartElements.push(chartContainer);
    });

    // Render with mermaid
    try {
      await mermaid.run({
        nodes: chartElements,
        suppressErrors: true,
      });

      // 更新模态框内容（渲染后的 SVG）
      chartElements.forEach((el) => {
        if (modalState.chartId === el.id) {
          setModalState(prev => ({
            ...prev,
            chartContent: el.innerHTML,
          }));
        }
      });
    } catch (error) {
      console.error('mermaid.run failed:', error);
      chartElements.forEach((el) => {
        el.innerHTML = `<div class="mermaid-error" style="padding: 1rem; background: #fee2e2; border-radius: 8px; color: #dc2626;">
          <strong>图表渲染失败</strong>
          <pre style="margin: 0.5rem 0 0; font-size: 0.75rem; overflow-x: auto;">${el.textContent}</pre>
        </div>`;
      });
    }
  }, [reportId, modalState.chartId]);

  // 当报告加载完成后处理
  useEffect(() => {
    if (!loading && report) {
      const timer = setTimeout(() => {
        processMermaidBlocks();
        setHeadings(extractHeadings());
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, report, processMermaidBlocks, extractHeadings]);

  // 打开图表模态框
  const openChartModal = useCallback((chartId: string, chartCode: string) => {
    const chartEl = document.getElementById(chartId);
    if (chartEl) {
      setModalState({
        isOpen: true,
        chartContent: chartEl.innerHTML,
        chartId,
        chartCode,
      });
    }
  }, []);

  // 关闭模态框
  const closeChartModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 重试渲染图表
  const retryRenderChart = useCallback(async () => {
    if (!modalState.chartId) return;

    const chartEl = document.getElementById(modalState.chartId);
    if (chartEl) {
      chartEl.innerHTML = modalState.chartCode;
      try {
        await mermaid.run({
          nodes: [chartEl],
          suppressErrors: true,
        });
        setModalState(prev => ({
          ...prev,
          chartContent: chartEl.innerHTML,
        }));
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }, [modalState.chartId, modalState.chartCode]);

  // 复制 Markdown
  const handleCopyMarkdown = async () => {
    if (report) {
      await navigator.clipboard.writeText(report.content);
      alert('已复制到剪贴板');
    }
  };

  // 保存到文件
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

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Markdown 组件
  const markdownComponents = {
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
    // Code block with copy button
    pre: (props: React.ComponentPropsWithoutRef<'pre'>) => {
      const { children, ...rest } = props;
      const [copied, setCopied] = useState(false);
      let hasMermaid = false;
      let codeText = '';

      if (children && typeof children === 'object' && 'props' in children) {
        const childProps = children.props as { className?: string; children?: string };
        const className = childProps?.className || '';
        hasMermaid = !!(className.includes('mermaid') || className.includes('language-mermaid'));
        codeText = childProps?.children || '';
      } else if (children && typeof children === 'string') {
        codeText = children;
      }

      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };

      return (
        <div className="code-block-wrapper">
          {!hasMermaid && (
            <button className="code-copy-btn" onClick={handleCopy} title={copied ? '已复制!' : '复制代码'}>
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          )}
          <pre className={hasMermaid ? 'code-pre mermaid-original' : 'code-pre'} {...rest}>{children}</pre>
        </div>
      );
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

  // 加载状态
  if (loading) {
    return <LoadingState message="加载报告..." />;
  }

  // 空状态
  if (!report || !project) {
    return (
      <EmptyState
        title="报告不存在"
        message="您访问的报告可能已被删除"
        actionLabel="返回项目列表"
        actionHref="/projects"
      />
    );
  }

  const keywords = JSON.parse(project.keywords || '[]');

  return (
    <div className="report-page">
      {/* 阅读进度条 */}
      <ReadingProgress containerRef={containerRef as React.RefObject<HTMLDivElement>} />

      {/* 面包屑导航 */}
      <BreadcrumbNav
        containerRef={containerRef as React.RefObject<HTMLDivElement>}
        headings={headings}
        projectTitle={project.title}
        reportTitle={report.title}
      />

      {/* 目录导航 */}
      <TableOfContents containerRef={containerRef as React.RefObject<HTMLDivElement>} headings={headings} />

      {/* 图表模态框 */}
      <ChartModal
        isOpen={modalState.isOpen}
        onClose={closeChartModal}
        chartContent={modalState.chartContent}
        chartId={modalState.chartId}
        chartCode={modalState.chartCode}
        onRetry={retryRenderChart}
      />

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
          <button className="btn btn-secondary" onClick={() => window.print()} title="导出 PDF">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
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
          <Markdown
            components={markdownComponents}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {report.content}
          </Markdown>
        </div>
      </article>
    </div>
  );
}
