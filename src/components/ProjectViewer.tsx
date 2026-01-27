"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  keywords: string;
  status: 'completed' | 'processing' | 'pending' | 'draft' | 'failed';
  progress: number;
  progress_message: string;
  used_llm: number;
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

interface TaskStatus {
  id: string;
  status: string;
  error?: string;
}

export default function ProjectViewer({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [task, setTask] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjectData = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?id=${projectId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.data);
        setReport(data.data.report);
        setSearchResults(data.data.searchResults || []);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 获取任务进度（轮询）
  const fetchTaskProgress = useCallback(async () => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/research?projectId=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        // 更新进度信息
        if (data.data.project) {
          setProject(prev => prev ? { ...prev, ...data.data.project } : null);
        }
        if (data.data.task) {
          setTask(data.data.task);
        }

        // 如果项目完成或失败，停止轮询
        if (data.data.project?.status === 'completed' || data.data.project?.status === 'failed') {
          // 刷新项目数据以获取报告
          await fetchProjectData();
        }
      }
    } catch (error) {
      console.error('Failed to fetch task progress:', error);
    }
  }, [projectId, fetchProjectData]);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchTaskProgress();

      // 设置轮询间隔（每3秒）
      const pollInterval = setInterval(fetchTaskProgress, 3000);

      // 组件卸载时清除轮询
      return () => clearInterval(pollInterval);
    }
  }, [projectId, fetchProjectData, fetchTaskProgress]);

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

  // 获取状态显示文本
  const getStatusDisplay = () => {
    if (!project) return null;

    switch (project.status) {
      case 'pending':
        return { text: '等待中', color: 'var(--warning)', bgColor: 'var(--warning-light)' };
      case 'processing':
        return { text: '调研中', color: 'var(--info)', bgColor: 'var(--info-light)' };
      case 'completed':
        return { text: '已完成', color: 'var(--success)', bgColor: 'var(--success-light)' };
      case 'failed':
        return { text: '失败', color: 'var(--error)', bgColor: 'var(--error-light)' };
      default:
        return null;
    }
  };

  if (loading) return (
    <div className="detail-page">
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </div>
  );

  if (!project) return (
    <div className="detail-page">
      <div className="empty-state card">
        <div className="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01" />
          </svg>
        </div>
        <h3>项目不存在</h3>
        <p>您访问的项目可能已被删除</p>
        <Link href="/projects" className="btn btn-primary">返回项目列表</Link>
      </div>
    </div>
  );

  const sourceCount = searchResults.reduce((acc, r) => {
    const source = r.source.split('-')[0];
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusDisplay = getStatusDisplay();
  const isProcessing = project.status === 'pending' || project.status === 'processing';
  const isDraft = project.status === 'draft';

  const handleStartResearch = async () => {
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success) {
        // 刷新数据以获取最新状态
        fetchProjectData();
      } else {
        alert(data.error || '启动调研失败');
      }
    } catch (error) {
      console.error('Failed to start research:', error);
      alert('启动调研失败');
    }
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
        <div className="page-header-title">
          <h1>{project.title}</h1>
          {/* 已完成项目显示 AI/规则图标 */}
          {project.status === 'completed' && project.used_llm === 1 && (
            <span className="llm-icon llm-icon-ai" title="AI 大模型生成" style={{ marginRight: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <circle cx="15.5" cy="8.5" r="1.5" />
              </svg>
            </span>
          )}
          {project.status === 'completed' && project.used_llm === 0 && (
            <span className="llm-icon llm-icon-rule" title="规则分析生成" style={{ marginRight: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
          )}
          {statusDisplay && (
            <span className="status-badge" style={{
              backgroundColor: statusDisplay.bgColor,
              color: statusDisplay.color,
            }}>
              {statusDisplay.text}
            </span>
          )}
        </div>
        <p className="project-date">创建于 {formatDate(project.created_at)}</p>
      </header>

      {/* 草稿状态 - 开始调研按钮 */}
      {isDraft && (
        <div className="draft-section card">
          <div className="draft-content">
            <div className="draft-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className="draft-info">
              <h3>调研尚未开始</h3>
              <p>点击下方按钮开始产品调研，任务将在后台执行</p>
            </div>
          </div>
          <button onClick={handleStartResearch} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            开始调研
          </button>
        </div>
      )}

      {/* 调研进度显示 */}
      {isProcessing && (
        <div className="progress-section card">
          <div className="progress-header">
            <div className="progress-icon">
              {project.status === 'pending' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
            </div>
            <div className="progress-info">
              <div className="progress-message">{project.progress_message || '准备中...'}</div>
              <div className="progress-percentage">{project.progress || 0}%</div>
            </div>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${project.progress || 0}%`,
                backgroundColor: statusDisplay?.color || 'var(--color-primary)',
              }}
            />
          </div>
        </div>
      )}

      {/* 失败状态显示 */}
      {project.status === 'failed' && task?.error && (
        <div className="error-section card">
          <div className="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="error-message">
            <h3>调研失败</h3>
            <p>{task.error}</p>
          </div>
          <Link href="/projects" className="btn btn-secondary">返回项目</Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card card">
          <div className="stat-value">{searchResults.length}</div>
          <div className="stat-label">搜索结果</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{Object.keys(sourceCount).length}</div>
          <div className="stat-label">数据来源</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{report ? '已生成' : (isProcessing ? '生成中...' : '待生成')}</div>
          <div className="stat-label">调研报告</div>
        </div>
      </div>

      {report && project.status === 'completed' && (
        <div className="report-section card">
          <div className="report-content">
            <div className="report-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <div className="report-info">
              <h3>调研报告已生成</h3>
              <p>包含完整的功能分析、竞品对比、SWOT分析和机会洞察</p>
            </div>
          </div>
          <Link href={`/reports?id=${report.id}`} className="btn btn-primary">查看完整报告</Link>
        </div>
      )}
    </div>
  );
}
