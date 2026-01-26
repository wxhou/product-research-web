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

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${createRes.status}`);
      }

      const createData = await createRes.json();

      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create project');
      }

      if (createData.data?.id) {
        // 2. 启动调研
        const researchRes = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: createData.data.id,
            keywords: [],
          }),
        });

        if (!researchRes.ok) {
          const errorData = await researchRes.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${researchRes.status}`);
        }

        const researchData = await researchRes.json();

        if (!researchData.success) {
          throw new Error(researchData.error || 'Research failed');
        }

        // 3. 跳转到项目详情页
        router.push(`/projects?id=${createData.data.id}`);
      }
    } catch (error) {
      console.error('Research failed:', error);
      alert(error instanceof Error ? error.message : '调研失败，请稍后重试');
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
        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            AI 驱动的产品调研助手
          </div>
          <h1>产品调研助手</h1>
          <p>从全网收集产品方案、技术路线、行业趋势，输出详细的功能推荐和机会分析</p>

          <div className="research-form card">
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

            <button
              className="btn btn-primary research-btn"
              onClick={handleResearch}
              disabled={isResearching || !keyword.trim()}
            >
              {isResearching ? (
                <>
                  <span className="spinner"></span>
                  调研中...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  开始调研
                </>
              )}
            </button>
          </div>

          <div className="hero-features">
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>多数据源聚合</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>AI 智能分析</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>可视化报告</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="recent-section">
        <div className="section-header">
          <div>
            <h2>最近调研</h2>
            <p className="section-desc">查看和管理您的调研项目</p>
          </div>
          <Link href="/projects" className="view-all-link">
            查看全部
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card card">
                <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '12px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '40%' }}></div>
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3>暂无调研项目</h3>
            <p>输入调研主题，开始您的第一个产品调研</p>
          </div>
        ) : (
          <div className="project-grid">
            {recentProjects.map((project, index) => (
              <Link
                key={project.id}
                href={`/projects?id=${project.id}`}
                className="project-card card animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="project-header">
                  <div className="project-status">
                    {getStatusBadge(project.status)}
                  </div>
                  <span className="project-date">{formatDate(project.created_at)}</span>
                </div>
                <h3 className="project-title">{project.title}</h3>
                <div className="project-footer">
                  <span className="project-action">
                    查看详情
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
