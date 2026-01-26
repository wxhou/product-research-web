"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function ProjectViewer({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
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
  };

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
        <p className="project-date">创建于 {formatDate(project.created_at)}</p>
      </header>

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
          <div className="stat-value">{report ? '已生成' : '生成中'}</div>
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
