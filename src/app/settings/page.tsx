'use client';

import { useState } from 'react';

interface DataSource {
  id: string;
  name: string;
  type: 'brave' | 'exa' | 'firecrawl' | 'context7';
  enabled: boolean;
  config: Record<string, string>;
}

export default function SettingsPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([
    {
      id: '1',
      name: 'Brave Search',
      type: 'brave',
      enabled: true,
      config: { apiKey: '****-****-****' },
    },
    {
      id: '2',
      name: 'Exa',
      type: 'exa',
      enabled: true,
      config: { apiKey: '****-****-****' },
    },
    {
      id: '3',
      name: 'Firecrawl',
      type: 'firecrawl',
      enabled: false,
      config: { apiKey: '' },
    },
    {
      id: '4',
      name: 'Context7',
      type: 'context7',
      enabled: true,
      config: { apiKey: '****-****-****' },
    },
  ]);

  const toggleSource = (id: string) => {
    setDataSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, enabled: !source.enabled } : source
      )
    );
  };

  return (
    <div className="settings-page">
      <header className="page-header">
        <h1>设置</h1>
        <p>配置数据源和应用偏好</p>
      </header>

      <section className="settings-section">
        <h2>数据源</h2>
        <p className="section-desc">选择用于产品调研的数据源</p>

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
                  value={source.config.apiKey}
                  readOnly={!source.enabled}
                />
              </div>
              <button className="btn btn-secondary config-btn">
                配置
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>应用偏好</h2>

        <div className="preference-list">
          <div className="preference-item">
            <div className="preference-info">
              <h3>深色模式</h3>
              <p>使用深色主题（开发中）</p>
            </div>
            <label className="toggle">
              <input type="checkbox" />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>自动保存</h3>
              <p>调研时自动保存进度</p>
            </div>
            <label className="toggle">
              <input type="checkbox" defaultChecked />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <h3>报告语言</h3>
              <p>调研报告的默认语言</p>
            </div>
            <select className="input select">
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
      `}</style>
    </div>
  );
}
