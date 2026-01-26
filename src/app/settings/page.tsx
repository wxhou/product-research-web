'use client';

import { useState, useEffect } from 'react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  config: string;
  is_active: number;
}

interface DataSourceForm {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  apiKey: string;
}

export default function SettingsPage() {
  const [dataSources, setDataSources] = useState<DataSourceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      if (data.success) {
        setDataSources(
          data.data.map((ds: DataSource) => ({
            id: ds.id,
            name: ds.name,
            type: ds.type,
            enabled: ds.is_active === 1,
            apiKey: '',
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
      showMessage('error', '加载数据源失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (id: string) => {
    setDataSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, enabled: !source.enabled } : source
      )
    );
  };

  const updateApiKey = (id: string, apiKey: string) => {
    setDataSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, apiKey } : source
      )
    );
  };

  const saveSource = async (id: string) => {
    const source = dataSources.find(s => s.id === id);
    if (!source) return;

    setSaving(id);
    try {
      const res = await fetch('/api/data-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: source.id,
          name: source.name,
          is_active: source.enabled,
          config: { apiKey: source.apiKey || 'demo-key' },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '保存成功');
      } else {
        showMessage('error', data.error || '保存失败');
      }
    } catch (error) {
      showMessage('error', '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>设置</h1>
        <p>配置数据源和应用偏好</p>
        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
      </header>

      <section className="settings-section">
        <h2>数据源</h2>
        <p className="section-desc">选择用于产品调研的数据源，配置 API Key 后即可使用</p>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="source-list">
            {dataSources.map((source) => (
              <div key={source.id} className="source-item card">
                <div className="source-info">
                  <div className="source-header">
                    <h3>{source.name}</h3>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={() => toggleSource(source.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="source-type">{source.type}</p>
                </div>
                <div className="source-config">
                  <label>API Key</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="输入 API Key"
                    value={source.apiKey}
                    onChange={(e) => updateApiKey(source.id, e.target.value)}
                    disabled={!source.enabled}
                  />
                </div>
                <button
                  className="btn btn-secondary config-btn"
                  onClick={() => saveSource(source.id)}
                  disabled={saving === source.id || !source.enabled}
                >
                  {saving === source.id ? '保存中...' : '保存'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>应用偏好</h2>

        <div className="preference-list">
          <div className="preference-item">
            <div className="preference-info">
              <h3>报告语言</h3>
              <p>调研报告的默认语言</p>
            </div>
            <select className="input select" defaultValue="zh">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      <style jsx>{`
        .settings-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        .page-header {
          margin-bottom: 2.5rem;
        }

        .page-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--foreground-secondary);
        }

        .message {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .message.success {
          background: #ecfdf5;
          color: #059669;
        }

        .message.error {
          background: #fef2f2;
          color: #dc2626;
        }

        .settings-section {
          margin-bottom: 3rem;
        }

        .settings-section h2 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .section-desc {
          color: var(--foreground-secondary);
          margin-bottom: 1.25rem;
        }

        .source-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .source-item {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .source-info {
          flex: 1;
        }

        .source-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .source-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }

        .source-type {
          font-size: 0.8125rem;
          color: var(--foreground-muted);
          font-family: monospace;
        }

        .source-config {
          flex: 1;
        }

        .source-config label {
          display: block;
          font-size: 0.75rem;
          color: var(--foreground-secondary);
          margin-bottom: 0.375rem;
        }

        .config-btn {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
        }

        .preference-list {
          background: var(--background-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .preference-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-light);
        }

        .preference-item:last-child {
          border-bottom: none;
        }

        .preference-info h3 {
          font-size: 0.9375rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .preference-info p {
          font-size: 0.8125rem;
          color: var(--foreground-secondary);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--border);
          border-radius: 26px;
          transition: all var(--transition-fast);
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: all var(--transition-fast);
        }

        .toggle input:checked + .toggle-slider {
          background: var(--color-primary);
        }

        .toggle input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .select {
          width: auto;
          padding: 0.5rem 2rem 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: var(--foreground-muted);
        }
      `}</style>
    </div>
  );
}
