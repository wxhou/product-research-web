'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
  description: string;
  free: boolean;
}

export default function SettingsPage() {
  const [dataSources, setDataSources] = useState<DataSourceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();

  // 权限检查
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchDataSources();
    }
  }, [isAuthenticated]);

  const fetchDataSources = async () => {
    try {
      const res = await fetch('/api/data-sources');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const descriptions: Record<string, string> = {
          'rss-hackernews': '技术社区新闻聚合',
          'rss-techcrunch': '科技新闻报道',
          'rss-theverge': '科技和娱乐新闻',
          'rss-wired': '深度科技报道',
          'rss-producthunt': '新产品发布平台',
          'duckduckgo': '免费搜索引擎',
          'github': '开源项目搜索',
          'bing': '微软搜索（需 API Key）',
          'newsapi': '新闻聚合服务（需 API Key）',
          'gnews': '全球新闻服务（需 API Key）',
        };
        const freeSources = ['rss-hackernews', 'rss-techcrunch', 'rss-theverge', 'rss-wired', 'rss-producthunt', 'duckduckgo', 'github'];

        setDataSources(
          data.data.map((ds: DataSource) => ({
            id: ds.id,
            name: ds.name,
            type: ds.type,
            enabled: ds.is_active === 1,
            apiKey: '',
            description: descriptions[ds.id] || '',
            free: freeSources.includes(ds.id),
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

  // 非管理员访问时显示拒绝页面
  if (!authLoading && isAuthenticated && !isAdmin) {
    return (
      <div className="settings-page">
        <div className="access-denied card">
          <div className="access-denied-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2>访问被拒绝</h2>
          <p>只有管理员才能访问设置页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div className="header-content">
          <h1>设置</h1>
          <p>配置数据源和应用偏好</p>
        </div>
        {message && (
          <div className={`message toast ${message.type}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {message.type === 'success' ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </>
              )}
            </svg>
            {message.text}
          </div>
        )}
      </header>

      <section className="settings-section">
        <div className="section-header">
          <div className="section-info">
            <h2>数据源</h2>
            <p>选择用于产品调研的数据源，部分需要配置 API Key</p>
          </div>
          <div className="source-stats">
            <span className="stat-badge free">{dataSources.filter(s => s.free).length} 个免费</span>
            <span className="stat-badge paid">{dataSources.filter(s => !s.free).length} 个需 Key</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-list">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-item card">
                <div className="skeleton" style={{ height: '24px', width: '30%', marginBottom: '12px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '50%' }}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="source-grid">
            {dataSources.map((source) => (
              <div key={source.id} className={`source-card card ${source.enabled ? 'enabled' : ''}`}>
                <div className="source-header">
                  <div className="source-title">
                    <div className="source-name">
                      <h3>{source.name}</h3>
                      {source.free && <span className="free-badge">免费</span>}
                    </div>
                    <p className="source-desc">{source.description}</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={() => toggleSource(source.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {!source.free && (
                  <div className="source-config">
                    <input
                      type="password"
                      className="input"
                      placeholder="输入 API Key"
                      value={source.apiKey}
                      onChange={(e) => updateApiKey(source.id, e.target.value)}
                      disabled={!source.enabled}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => saveSource(source.id)}
                      disabled={saving === source.id || !source.enabled}
                    >
                      {saving === source.id ? '保存中...' : '保存'}
                    </button>
                  </div>
                )}

                {source.free && (
                  <div className="source-status">
                    <span className="status-active">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      默认启用
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <div className="section-header">
          <div className="section-info">
            <h2>大模型配置</h2>
            <p>配置用于 AI 分析和报告生成的大模型 API</p>
          </div>
        </div>

        <div className="preference-card card">
          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h3>模型提供商</h3>
                <p>选择使用的大模型服务</p>
              </div>
            </div>
            <select className="input select" id="provider" defaultValue="openai">
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="azure">Azure OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="deepseek">DeepSeek (Chat)</option>
              <option value="gemini">Google Gemini</option>
              <option value="moonshot">Moonshot (Kimi)</option>
              <option value="compatible">OpenAI 兼容 API (本地/自定义)</option>
            </select>
          </div>

          <div className="preference-item" id="base-url-item" style={{ display: 'none' }}>
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h3>API 地址</h3>
                <p>自定义 API 端点地址</p>
              </div>
            </div>
            <input
              type="text"
              className="input"
              id="base-url"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3>API Key</h3>
                <p>输入您的 API Key 以启用 AI 功能</p>
              </div>
            </div>
            <div className="api-key-input">
              <input
                type="password"
                className="input"
                id="api-key"
                placeholder="sk-..."
              />
              <button className="btn btn-primary" id="save-llm">保存</button>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
                </svg>
              </div>
              <div>
                <h3>模型名称</h3>
                <p>输入具体的模型名称</p>
              </div>
            </div>
            <input
              type="text"
              className="input"
              id="model-name"
              placeholder="gpt-4, claude-3-5-sonnet, 自定义模型名"
            />
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3>温度参数</h3>
                <p>控制输出的随机性 (0-2，越高越创意)</p>
              </div>
            </div>
            <div className="slider-container">
              <input
                type="range"
                className="slider"
                id="temperature"
                min="0"
                max="2"
                step="0.1"
                defaultValue="0.7"
              />
              <span className="slider-value" id="temperature-value">0.7</span>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <h3>超时时间</h3>
                <p>API 请求超时 (秒)</p>
              </div>
            </div>
            <input
              type="number"
              className="input"
              id="timeout"
              min="30"
              max="300"
              defaultValue="120"
              style={{ width: '100px' }}
            />
          </div>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const provider = document.getElementById('provider');
            const baseUrlItem = document.getElementById('base-url-item');
            const saveBtn = document.getElementById('save-llm');
            const tempSlider = document.getElementById('temperature');
            const tempValue = document.getElementById('temperature-value');

            // 显示/隐藏自定义 API 地址输入框
            function updateBaseUrlVisibility() {
              if (provider.value === 'compatible' || provider.value === 'azure') {
                baseUrlItem.style.display = 'flex';
              } else {
                baseUrlItem.style.display = 'none';
              }
            }

            provider.addEventListener('change', updateBaseUrlVisibility);

            // 温度滑块值更新
            tempSlider.addEventListener('input', function() {
              tempValue.textContent = this.value;
            });

            // 加载保存的配置
            async function loadConfig() {
              try {
                const res = await fetch('/api/settings/llm');
                const data = await res.json();
                if (data.success && data.data) {
                  const config = data.data;
                  if (config.provider) provider.value = config.provider;
                  if (config.baseUrl) document.getElementById('base-url').value = config.baseUrl;
                  if (config.apiKey) document.getElementById('api-key').value = config.apiKey;
                  if (config.modelName) document.getElementById('model-name').value = config.modelName;
                  if (config.temperature) {
                    tempSlider.value = config.temperature;
                    tempValue.textContent = config.temperature;
                  }
                  if (config.timeout) document.getElementById('timeout').value = config.timeout;
                }
              } catch (e) {
                console.error('Failed to load LLM config:', e);
              }
            }

            // 保存配置
            async function saveConfig() {
              const config = {
                provider: provider.value,
                baseUrl: document.getElementById('base-url').value || null,
                apiKey: document.getElementById('api-key').value || null,
                modelName: document.getElementById('model-name').value || null,
                temperature: parseFloat(tempSlider.value),
                timeout: parseInt(document.getElementById('timeout').value) || 120,
              };

              try {
                const res = await fetch('/api/settings/llm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(config),
                });
                const data = await res.json();
                if (data.success) {
                  alert('保存成功');
                } else {
                  alert('保存失败: ' + data.error);
                }
              } catch (e) {
                alert('保存失败');
              }
            }

            saveBtn.addEventListener('click', saveConfig);

            // 初始化
            loadConfig();
            updateBaseUrlVisibility();
          })();
        `
      }} />


      <section className="settings-section">
        <h2>应用偏好</h2>

        <div className="preference-card card">
          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <h3>报告语言</h3>
                <p>调研报告的默认语言</p>
              </div>
            </div>
            <select className="input select" defaultValue="zh">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
