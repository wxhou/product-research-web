'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  created_at: string;
  status: 'completed' | 'processing' | 'draft';
  keywords: string;
}

export default function HomePage() {
  const [keyword, setKeyword] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 获取最近项目
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setRecentProjects(data.data.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResearch = async () => {
    if (!keyword.trim()) return;
    setIsResearching(true);

    try {
      // 1. 创建项目
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: keyword,
          description: '',
          keywords: [],
        }),
      });
      const createData = await createRes.json();

      if (createData.success) {
        // 2. 启动调研
        const researchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: createData.data.id,
            keywords: [],
          }),
        });
        const researchData = await researchRes.json();

        if (researchData.success) {
          // 3. 跳转到项目详情页
          router.push(`/projects/${createData.data.id}`);
        }
      }
    } catch (error) {
      console.error('Research failed:', error);
    } finally {
      setIsResearching(false);
    }
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <main className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content animate-fade-in">
          <h1>产品调研助手</h1>
          <p>从全网收集产品方案、技术路线、行业趋势，输出详细的功能推荐和机会分析</p>

          <div className="research-form">
            <div className="form-group">
              <label>调研主题</label>
              <input
                type="text"
                className="input"
                placeholder="例如：智慧运维产品的故障维修预测性维护"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
              />
            </div>

            <div className="form-group">
              <label>关键词（选填）</label>
              <input
                type="text"
                className="input"
                placeholder="智慧运维, 故障预测, PHM"
              />
            </div>

            <button
              className="btn btn-primary research-btn"
              onClick={handleResearch}
              disabled={isResearching || !keyword.trim()}
            >
              {isResearching ? (
                <>
                  <span className="spinner" />
                  调研中...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  开始调研
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="recent-section">
        <div className="section-header">
          <h2>最近调研</h2>
          <Link href="/projects" className="view-all">
            查看全部
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : recentProjects.length === 0 ? (
          <div className="empty-state">暂无调研项目</div>
        ) : (
          <div className="project-grid animate-stagger">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="project-card card">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  {getStatusBadge(project.status)}
                </div>
                <div className="project-meta">
                  <span>{formatDate(project.created_at)}</span>
                  <span>·</span>
                  <span>{project.status === 'completed' ? '已完成' : project.status === 'processing' ? '进行中' : '草稿'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .home {
          min-height: 100vh;
        }

        .hero {
          padding: 4rem 0;
          text-align: center;
        }

        .hero-content {
          max-width: 640px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          letter-spacing: -0.03em;
        }

        .hero p {
          font-size: 1.125rem;
          color: var(--foreground-secondary);
          margin-bottom: 3rem;
        }

        .research-form {
          background: var(--background-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 2rem;
          text-align: left;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--foreground);
        }

        .research-btn {
          width: 100%;
          height: 48px;
          font-size: 1rem;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .recent-section {
          padding: 3rem 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.5rem;
        }

        .view-all {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9375rem;
          font-weight: 500;
          color: var(--color-primary);
        }

        .view-all:hover {
          text-decoration: underline;
        }

        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 1rem;
        }

        .project-card {
          display: block;
          text-decoration: none;
          padding: 1.5rem;
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .project-header h3 {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--foreground);
          line-height: 1.4;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          flex-shrink: 0;
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
          font-size: 0.875rem;
          color: var(--foreground-muted);
        }

        .loading, .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--foreground-muted);
        }
      `}</style>
    </main>
  );
}
