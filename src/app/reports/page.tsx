'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReportViewer from '../../components/ReportViewer';

interface Report {
  id: string;
  title: string;
  content: string;
  created_at: string;
  project_id: string;
}

interface Project {
  id: string;
  title: string;
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const reportIdFromQuery = searchParams?.get('id') || null;

  const [reports, setReports] = useState<(Report & { project: Project })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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
    });
  };

  if (reportIdFromQuery) {
    return (
      <div className="reports-page">
        <ReportViewer reportId={reportIdFromQuery} />
      </div>
    );
  }

  return (
    <div className="reports-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>报告</h1>
            <p className="header-desc">查看和管理您的调研报告</p>
          </div>
          <Link href="/" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建调研
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="loading-list">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-item card">
              <div className="skeleton" style={{ height: '20px', width: '40%', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '30%' }}></div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <h3>暂无调研报告</h3>
          <p>创建一个新的调研项目来生成报告</p>
          <Link href="/" className="btn btn-primary">
            立即开始调研
          </Link>
        </div>
      ) : (
        <div className="report-list">
          {reports.map((report, index) => (
            <Link
              key={report.id}
              href={`/reports?id=${report.id}`}
              className="report-item card animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="report-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </div>
              <div className="report-main">
                <div className="report-header">
                  <h3>{report.title}</h3>
                </div>
                <div className="report-meta">
                  <span className="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {formatDate(report.created_at)}
                  </span>
                  {report.project && (
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      {report.project.title}
                    </span>
                  )}
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="reports-page">
      <div className="loading-list">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-item card">
            <div className="skeleton" style={{ height: '20px', width: '40%', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ height: '14px', width: '30%' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReportsContent />
    </Suspense>
  );
}
