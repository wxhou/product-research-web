'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  description: string;
  keywords: string;
  status: 'completed' | 'processing' | 'draft';
  created_at: string;
}

interface Report {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface SearchResult {
  id: string;
  source: string;
  title: string;
  url: string;
  content: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data.project);
        setReport(data.data.report);
        setSearchResults(data.data.searchResults || []);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: '采集', label: '数据采集', icon: '🔍' },
    { key: '分析', label: '数据分析', icon: '📊' },
    { key: '生成', label: '报告生成', icon: '📝' },
  ];

  const getCurrentStep = () => {
    if (!project) return '采集';
    switch (project.status) {
      case 'draft': return '采集';
      case 'processing': return '分析';
      case 'completed': return '生成';
      default: return '采集';
    }
  };

  const getProgress = () => {
    if (!project) return 0;
    switch (project.status) {
      case 'draft': return 15;
      case 'processing': return 60;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getStepIndex = (step: string) => ['采集', '分析', '生成'].indexOf(step);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="detail-page">
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

  if (!project) {
    return (
      <div className="detail-page">
        <div className="empty-state">
          <p>项目不存在</p>
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

  const currentStep = getCurrentStep();
  const progress = getProgress();

  // 生成调研日志
  const logs = [
    { time: project.created_at, message: '创建调研项目', status: 'success' },
    ...(project.status !== 'draft' ? [
      { time: project.created_at, message: '开始数据采集', status: 'success' },
      { time: project.created_at, message: `获取到 ${searchResults.length} 条搜索结果`, status: 'success' },
    ] : []),
    ...(project.status === 'processing' ? [
      { time: project.created_at, message: '正在分析产品功能特征...', status: 'processing' },
    ] : []),
    ...(project.status === 'completed' ? [
      { time: report?.created_at || project.created_at, message: '数据采集完成', status: 'success' },
      { time: report?.created_at || project.created_at, message: '正在生成调研报告...', status: 'success' },
      { time: report?.created_at || project.created_at, message: '调研报告生成完成', status: 'success' },
    ] : []),
  ];

  // 统计数据
  const stats = {
    international: searchResults.filter(r => ['brave', 'exa', 'firecrawl', 'context7'].includes(r.source)).length,
    china: 0,
    total: searchResults.length,
  };

  return (
    <div className="detail-page">
      <header className="page-header">
        <Link href="/projects" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回项目
        </Link>
        <h1>{project.title}</h1>
      </header>

      <div className="progress-section">
        <div className="progress-steps">
          {steps.map((s) => (
            <div
              key={s.key}
              className={`progress-step ${currentStep === s.key ? 'active' : ''} ${getStepIndex(currentStep) > getStepIndex(s.key) ? 'completed' : ''}`}
            >
              <div className="step-icon">{s.icon}</div>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="progress-text">
          {project.status === 'completed'
            ? '调研已完成'
            : project.status === 'processing'
            ? `正在收集和分析数据...`
            : '准备开始调研'}
        </p>
      </div>

      <div className="content-section">
        <div className="logs-section card">
          <h2>调研日志</h2>
          <div className="logs-list">
            {logs.map((log, index) => (
              <div key={index} className={`log-item ${log.status}`}>
                <span className="log-time">{formatTime(log.time)}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <div className="stat-card card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">搜索结果</div>
          </div>
          <div className="stat-card card">
            <div className="stat-value">{stats.international}</div>
            <div className="stat-label">国际产品</div>
          </div>
          <div className="stat-card card">
            <div className="stat-value">{stats.china}</div>
            <div className="stat-label">中国产品</div>
          </div>
        </div>
      </div>

      {report && project.status === 'completed' && (
        <div className="report-section card">
          <h2>调研报告</h2>
          <Link href={`/reports/${report.id}`} className="btn btn-primary">
            查看完整报告
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      <style jsx>{`
        .detail-page {
          max-width: 1000px;
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

        .page-header h1 {
          font-size: 1.5rem;
        }

        .progress-section {
          background: var(--background-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .progress-steps {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          opacity: 0.4;
        }

        .progress-step.active {
          opacity: 1;
        }

        .progress-step.completed {
          opacity: 0.7;
        }

        .step-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background-subtle);
          border-radius: 50%;
          font-size: 1.25rem;
        }

        .progress-step.active .step-icon {
          background: var(--color-primary-light);
        }

        .step-label {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .progress-bar {
          height: 6px;
          background: var(--background-subtle);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-fill {
          height: 100%;
          background: var(--color-primary);
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          color: var(--foreground-secondary);
          text-align: center;
        }

        .content-section {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .logs-section h2 {
          font-size: 1rem;
          margin-bottom: 1rem;
        }

        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .log-item {
          display: flex;
          gap: 1rem;
          padding: 0.5rem 0;
          font-size: 0.8125rem;
          border-bottom: 1px solid var(--border-light);
        }

        .log-time {
          color: var(--foreground-muted);
          font-family: monospace;
        }

        .log-message {
          color: var(--foreground);
        }

        .log-item.success .log-message {
          color: var(--success);
        }

        .log-item.processing .log-message {
          color: var(--warning);
        }

        .stats-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .stat-card {
          text-align: center;
          padding: 1.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-primary);
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8125rem;
          color: var(--foreground-secondary);
        }

        .report-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
        }

        .report-section h2 {
          font-size: 1rem;
          margin: 0;
        }

        .report-section .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--foreground-muted);
        }

        @media (max-width: 768px) {
          .content-section {
            grid-template-columns: 1fr;
          }

          .progress-steps {
            gap: 1rem;
          }

          .step-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
