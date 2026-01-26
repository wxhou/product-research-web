'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProjectViewer from '../../components/ProjectViewer';

interface Project {
  id: string;
  title: string;
  created_at: string;
  status: 'completed' | 'processing' | 'draft';
  keywords: string;
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams?.get('id') || null;

  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'draft'>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusConfig = (status: Project['status']) => {
    const config = {
      completed: { label: '已完成', className: 'status-completed', icon: 'check' },
      processing: { label: '进行中', className: 'status-processing', icon: 'loader' },
      draft: { label: '草稿', className: 'status-draft', icon: 'edit' },
    };
    return config[status];
  };

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'completed', label: '已完成' },
    { key: 'processing', label: '进行中' },
    { key: 'draft', label: '草稿' },
  ] as const;

  if (projectIdFromQuery) {
    return (
      <div className="projects-page">
        <ProjectViewer projectId={projectIdFromQuery} />
      </div>
    );
  }

  return (
    <div className="projects-page">
      <header className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>项目</h1>
            <p className="header-desc">管理和查看您的产品调研项目</p>
          </div>
          <Link href="/" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建调研
          </Link>
        </div>
      </header>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="filter-count">
              {f.key === 'all' ? projects.length : projects.filter(p => p.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-list">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-item card">
              <div className="skeleton" style={{ height: '20px', width: '40%', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ height: '14px', width: '30%' }}></div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3>{projects.length === 0 ? '暂无调研项目' : '没有找到相关项目'}</h3>
          <p>{projects.length === 0 ? '创建一个新的调研项目开始吧' : '尝试切换筛选条件'}</p>
          {projects.length === 0 && (
            <Link href="/" className="btn btn-primary">
              立即开始调研
            </Link>
          )}
        </div>
      ) : (
        <div className="project-list">
          {filteredProjects.map((project, index) => {
            const statusConfig = getStatusConfig(project.status);
            return (
              <Link
                key={project.id}
                href={`/projects?id=${project.id}`}
                className="project-item card animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="project-icon">
                  {statusConfig.icon === 'check' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {statusConfig.icon === 'loader' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {statusConfig.icon === 'edit' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  )}
                </div>

                <div className="project-main">
                  <div className="project-header">
                    <h3>{project.title}</h3>
                    <span className={`status-badge ${statusConfig.className}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="project-meta">
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>

                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
