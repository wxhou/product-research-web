'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// 可用模型列表
const MODEL_OPTIONS: Record<string, Array<{ value: string; label: string; desc?: string }>> = {
  deepseek: [
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', desc: '推理模型，适合复杂分析' },
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', desc: '通用对话，性价比高' },
    { value: 'deepseek-ai/DeepSeek-V3.2', label: 'DeepSeek-V3.2', desc: '最新版本，支持工具调用' },
    { value: 'deepseek-ai/DeepSeek-V2.5', label: 'DeepSeek-V2.5', desc: '平衡性能与速度' },
  ],
  moonshot: [
    { value: 'moonshot-v1-8k', label: 'Moonshot-V1 8K', desc: '基础上下文 8K' },
    { value: 'moonshot-v1-32k', label: 'Moonshot-V1 32K', desc: '长上下文 32K' },
    { value: 'moonshot-v1-128k', label: 'Moonshot-V1 128K', desc: '超长上下文 128K' },
    { value: 'moonshot-v1-k2', label: 'Moonshot-K2', desc: '最新开源思考模型' },
  ],
  modelscope: [
    // DeepSeek - 最新版本放在前面作为默认
    { value: 'deepseek-ai/DeepSeek-R1-0528', label: 'DeepSeek-R1-0528', desc: '最新升级版，推荐默认' },
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', desc: '推理模型' },
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', desc: '通用对话' },
    // Qwen 系列
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B-Instruct', desc: '阿里千问旗舰' },
    { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B-Instruct', desc: '高性能平衡' },
    { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B-Instruct', desc: '轻量快速' },
    { value: 'Qwen/Qwen3-8B', label: 'Qwen3-8B', desc: '最新 8B' },
    { value: 'Qwen/Qwen3-14B', label: 'Qwen3-14B', desc: '最新 14B' },
    { value: 'Qwen/Qwen3-32B', label: 'Qwen3-32B', desc: '最新 32B' },
    { value: 'Qwen/QwQ-32B', label: 'QwQ-32B', desc: '思考模型' },
    { value: 'Qwen/Qwen2.5-VL-72B-Instruct', label: 'Qwen2.5-VL-72B', desc: '视觉语言模型' },
    // GLM
    { value: 'ZhipuAI/GLM-4.7-Flash', label: 'GLM-4.7-Flash', desc: '智谱轻量版' },
    // Yi
    { value: '01ai/Yi-1.5-34B-Instruct', label: 'Yi-1.5-34B-Instruct', desc: '零一万物' },
  ],
  siliconflow: [
    // DeepSeek
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', desc: '推理模型' },
    { value: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', desc: '通用对话' },
    { value: 'deepseek-ai/DeepSeek-V3.2', label: 'DeepSeek-V3.2', desc: '最新版本' },
    { value: 'deepseek-ai/DeepSeek-V3.1-Terminus', label: 'DeepSeek-V3.1-Terminus', desc: '稳定版本' },
    // Qwen
    { value: 'Qwen/Qwen3-8B', label: 'Qwen3-8B', desc: '最新 8B' },
    { value: 'Qwen/Qwen3-14B', label: 'Qwen3-14B', desc: '最新 14B' },
    { value: 'Qwen/Qwen3-32B', label: 'Qwen3-32B', desc: '最新 32B' },
    { value: 'Qwen/QwQ-32B', label: 'QwQ-32B', desc: '思考模型' },
    { value: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B', desc: '千问旗舰' },
    { value: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B', desc: '高性能' },
    { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B', desc: '轻量级' },
    { value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen2.5-Coder-32B', desc: '代码专用' },
    // GLM
    { value: 'Pro/zai-org/GLM-4.7', label: 'GLM-4.7', desc: '智谱最新旗舰' },
    { value: 'Pro/glm-4-plus', label: 'GLM-4-Plus', desc: '智谱旗舰' },
    { value: 'Pro/glm-4v', label: 'GLM-4V', desc: '视觉模型' },
    // Llama
    { value: 'meta-llama/Llama-3.1-70B-Instruct', label: 'Llama-3.1-70B', desc: 'Meta 开源' },
    { value: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama-3.3-70B', desc: '最新 Llama' },
    // 腾讯
    { value: 'tencent/Hunyuan-A13B-Instruct', label: 'Hunyuan-A13B', desc: '腾讯混元' },
  ],
  compatible: [
    { value: 'custom', label: '自定义模型', desc: '手动输入模型名称和 API 地址' },
  ],
};

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
  // 默认使用 ModelScope + DeepSeek-R1-0528
  const [selectedProvider, setSelectedProvider] = useState('modelscope');
  const [llmConfig, setLlmConfig] = useState<{
    provider: string;
    modelName: string;
    apiKey?: string;
    temperature: number;
  } | null>(null);
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
      fetchLLMConfig();
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

  const fetchLLMConfig = async () => {
    try {
      const res = await fetch('/api/settings/llm');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.success && data.data) {
        const config = data.data;
        setLlmConfig(config);
        // 更新表单状态
        setSelectedProvider(config.provider || 'modelscope');
      }
    } catch (error) {
      console.error('Failed to fetch LLM config:', error);
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
          {llmConfig?.apiKey && (
            <div className="current-model-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
              </svg>
              <span>
                当前使用: <strong>{llmConfig.modelName}</strong>
                {llmConfig.temperature !== 0.7 && ` (温度: ${llmConfig.temperature})`}
              </span>
            </div>
          )}
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
            <select
              className="input select"
              id="provider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="modelscope">ModelScope (魔搭)</option>
              <option value="deepseek">DeepSeek (Chat)</option>
              <option value="moonshot">Moonshot (Kimi)</option>
              <option value="siliconflow">SiliconFlow (硅基流动)</option>
              <option value="compatible">OpenAI 兼容 API (本地/自定义)</option>
            </select>
          </div>

          <div className="preference-item" id="base-url-item" style={{ display: selectedProvider === 'compatible' ? 'flex' : 'none' }}>
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
              placeholder="https://your-custom-api.com/v1"
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
                <p>{selectedProvider === 'compatible' ? '输入自定义模型名称' : '选择要使用的模型'}</p>
              </div>
            </div>
            {selectedProvider === 'compatible' ? (
              <input
                type="text"
                className="input"
                id="model-name"
                placeholder="如: gpt-4o, claude-3-5-sonnet"
              />
            ) : (
              <select className="input select" id="model-name">
                {MODEL_OPTIONS[selectedProvider]?.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                    {model.desc ? ` - ${model.desc}` : ''}
                  </option>
                ))}
              </select>
            )}
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

                  // 更新当前使用模型的显示
                  const currentModelBadge = document.querySelector('.current-model-badge');
                  if (config.apiKey && config.modelName) {
                    if (currentModelBadge) {
                      const modelSpan = currentModelBadge.querySelector('span');
                      if (modelSpan) {
                        const tempStr = config.temperature !== 0.7 ? ' (temp: ' + config.temperature + ')' : '';
                        modelSpan.innerHTML = 'Current: <strong>' + config.modelName + '</strong>' + tempStr;
                      }
                    }
                  }
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
                  // 重新加载配置并更新页面显示
                  await loadConfig();
                  // 更新当前使用模型的显示
                  const currentModelBadge = document.querySelector('.current-model-badge');
                  if (currentModelBadge && data.data && data.data.modelName) {
                    const modelSpan = currentModelBadge.querySelector('span');
                    if (modelSpan) {
                      const tempStr = data.data.temperature !== 0.7 ? ' (temp: ' + data.data.temperature + ')' : '';
                      modelSpan.innerHTML = 'Current: <strong>' + data.data.modelName + '</strong>' + tempStr;
                    }
                  }
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
