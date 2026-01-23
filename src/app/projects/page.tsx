'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  created_at: string;
  status: 'completed' | 'processing' | 'draft';
  keywords: string;
}

export default function ProjectsPage() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'draft'>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
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

  const getStatusBadge = (status: Project['status']) => {
    const config = {
      completed: { label: '已完成', className: 'status-completed' },
      processing: { label: '进行中', className: 'status-processing' },
      draft: { label: '草稿', className: 'status-draft' },
    };
    const { label, className } = config[status];
    return <span className={`status-badge ${className}`}>{label}</span>;
  };

  return (
    <div className="projects-page">
      <header className="page-header">
        <div className="header-content">
          <h1>项目</h1>
          <Link href="/" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            新建调研
          </Link>
        </div>
      </header>

      <div className="filter-bar">
        {(['all', 'completed', 'processing', 'draft'] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'completed' ? '已完成' : f === 'processing' ? '进行中' : '草稿'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <p>{projects.length === 0 ? '暂无调研项目' : '没有找到相关项目'}</p>
        </div>
      ) : (
        <div className="project-list animate-stagger">
          {filteredProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="project-item card">
              <div className="project-main">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  {getStatusBadge(project.status)}
                </div>
                <div className="project-meta">
                  <span>{formatDate(project.created_at)}</span>
                  <span>·</span>
                  <span>{project.status === 'completed' ? '已完成' : project.status === 'processing' ? '进行中' : '草稿'}</span>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .projects-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        .page-header {
          margin-bottom: 1.5rem;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          font-size: 1.75rem;
        }

        .filter-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-light);
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .filter-btn:hover {
          background: var(--background-subtle);
          color: var(--foreground);
        }

        .filter-btn.active {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .project-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          text-decoration: none;
        }

        .project-main {
          flex: 1;
        }

        .project-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .project-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
        }

        .status-completed {
          background: #ecfdf5;
          color: #059669;
        }

        .status-processing {
          background: #fef3c7;
          color: #d97706;
        }

        .status-draft {
          background: var(--background-subtle);
          color: var(--foreground-secondary);
        }

        .project-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--foreground-muted);
        }

        .chevron {
          color: var(--foreground-muted);
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--foreground-muted);
        }

        .loading {
          text-align: center;
          padding: 4rem 2rem;
          color: var(--foreground-muted);
        }
      `}</style>
    </div>
  );
}
