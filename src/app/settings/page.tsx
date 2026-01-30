'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// 可用模型列表
const MODEL_OPTIONS: Record<string, Array<{ value: string; label: string; desc?: string }>> = {
  ollama: [
    { value: 'llama3.2', label: 'Llama 3.2', desc: 'Meta 最新开源模型' },
    { value: 'llama3.1', label: 'Llama 3.1', desc: 'Meta 8B 指令微调' },
    { value: 'qwen2.5', label: 'Qwen 2.5', desc: '阿里千问本地版' },
    { value: 'qwen2.5-coder', label: 'Qwen 2.5 Coder', desc: '代码专用' },
    { value: 'deepseek-r1', label: 'DeepSeek R1', desc: '推理模型本地版' },
    { value: 'mistral', label: 'Mistral', desc: '欧洲开源模型' },
    { value: 'codellama', label: 'CodeLlama', desc: '代码专用' },
    { value: 'phi4', label: 'Phi-4', desc: '微软小模型' },
  ],
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
  description: string;
  config: string;
  is_active: number;
  is_free: number;
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
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [llmConfig, setLlmConfig] = useState<{
    provider: string;
    modelName: string;
    apiKey?: string;
    baseUrl?: string;
    temperature: number;
    timeout: number;
  } | null>(null);
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [llmTimeout, setLlmTimeout] = useState(120);
  const [llmSaving, setLlmSaving] = useState(false);
  // Crawl4AI 配置状态
  const [crawl4aiConfig, setCrawl4aiConfig] = useState<{
    url: string;
    enabled: boolean;
  } | null>(null);
  const [crawl4aiSaving, setCrawl4aiSaving] = useState(false);
  const [crawl4aiMessage, setCrawl4aiMessage] = useState<string | null>(null);

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
      fetchCrawl4AIConfig();
    }
  }, [isAuthenticated]);

  // 加载 Crawl4AI 配置
  const fetchCrawl4AIConfig = async () => {
    try {
      const res = await fetch('/api/settings/crawl4ai');
      const data = await res.json();
      if (data.success && data.data) {
        setCrawl4aiConfig(data.data);
      } else {
        // 默认值
        setCrawl4aiConfig({ url: 'http://localhost:11235', enabled: false });
      }
    } catch (e) {
      console.error('Failed to load Crawl4AI config:', e);
      setCrawl4aiConfig({ url: 'http://localhost:11235', enabled: false });
    }
  };

  // 保存 Crawl4AI 配置
  const saveCrawl4AIConfig = async () => {
    if (!crawl4aiConfig) return;
    setCrawl4aiSaving(true);
    setCrawl4aiMessage(null);
    try {
      const res = await fetch('/api/settings/crawl4ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crawl4aiConfig),
      });
      const data = await res.json();
      if (data.success) {
        setCrawl4aiMessage('配置已保存');
        setTimeout(() => setCrawl4aiMessage(null), 2000);
      } else {
        setCrawl4aiMessage('保存失败: ' + data.error);
      }
    } catch (e) {
      setCrawl4aiMessage('保存失败，请检查网络连接');
    } finally {
      setCrawl4aiSaving(false);
    }
  };

  const fetchDataSources = async () => {
    try {
      const res = await fetch('/api/data-sources');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setDataSources(
          data.data.map((ds: DataSource) => ({
            id: ds.id,
            name: ds.name,
            type: ds.type,
            enabled: ds.is_active === 1,
            apiKey: '',
            description: ds.description || '',
            free: ds.is_free === 1,
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
        setSelectedProvider(config.provider || 'ollama');
        setLlmBaseUrl(config.baseUrl || '');
        setLlmApiKey(config.apiKey || '');
        setLlmModelName(config.modelName || '');
        setLlmTemperature(config.temperature ?? 0.7);
        setLlmTimeout(config.timeout ?? 120);
      }
    } catch (error) {
      console.error('Failed to fetch LLM config:', error);
    }
  };

  // 保存 LLM 配置
  const saveLLMConfig = async () => {
    setLlmSaving(true);
    try {
      const config = {
        provider: selectedProvider,
        baseUrl: llmBaseUrl || null,
        apiKey: llmApiKey || null,
        modelName: llmModelName || null,
        temperature: llmTemperature,
        timeout: llmTimeout,
      };
      const res = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '配置保存成功');
        // 重新加载配置
        await fetchLLMConfig();
      } else {
        showMessage('error', '保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to save LLM config:', error);
      showMessage('error', '保存失败');
    } finally {
      setLlmSaving(false);
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
          config: source.apiKey ? { apiKey: source.apiKey } : null,
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
                      {source.free ? (
                        <span className="free-badge">免费</span>
                      ) : (
                        <span className="api-key-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          需要 API Key
                        </span>
                      )}
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
          {llmConfig?.modelName && (
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
              <option value="ollama">Ollama (本地)</option>
              <option value="modelscope">ModelScope (魔搭)</option>
              <option value="deepseek">DeepSeek (Chat)</option>
              <option value="moonshot">Moonshot (Kimi)</option>
              <option value="siliconflow">SiliconFlow (硅基流动)</option>
              <option value="compatible">OpenAI 兼容 API (本地/自定义)</option>
            </select>
          </div>

          <div className="preference-item" id="base-url-item" style={{ display: selectedProvider === 'ollama' || selectedProvider === 'compatible' ? 'flex' : 'none' }}>
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
              value={llmBaseUrl}
              onChange={(e) => setLlmBaseUrl(e.target.value)}
            />
          </div>

          <div className="preference-item" id="api-key-item" style={{ display: selectedProvider === 'ollama' ? 'none' : 'flex' }}>
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
            <input
              type="password"
              className="input"
              id="api-key"
              placeholder="sk-..."
              style={{ flex: 1, maxWidth: '400px' }}
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
            />
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
                <p>输入要使用的模型名称</p>
              </div>
            </div>
            <input
              type="text"
              className="input"
              id="model-name"
              placeholder={selectedProvider === 'ollama' ? '如: llama3.2, qwen2.5' : selectedProvider === 'compatible' ? '如: gpt-4o, claude-3-5-sonnet' : '输入模型名称'}
              style={{ flex: 1, maxWidth: '400px' }}
              value={llmModelName}
              onChange={(e) => setLlmModelName(e.target.value)}
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
                value={llmTemperature}
                onChange={(e) => setLlmTemperature(parseFloat(e.target.value))}
              />
              <span className="slider-value" id="temperature-value">{llmTemperature}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                className="input"
                id="timeout"
                min="30"
                max="300"
                value={llmTimeout}
                onChange={(e) => setLlmTimeout(parseInt(e.target.value) || 120)}
                style={{ width: '100px' }}
              />
              <button 
                className="btn btn-primary" 
                id="save-llm"
                onClick={saveLLMConfig}
                disabled={llmSaving}
              >
                {llmSaving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      </section>

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

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <div>
                <h3>Crawl4AI 全文爬虫</h3>
                <p>开源网页爬虫，用于获取完整页面内容（需本地部署）</p>
              </div>
            </div>
            <div className="crawl4ai-config" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px' }}>
              <div className="crawl4ai-url-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="http://localhost:11235"
                  value={crawl4aiConfig?.url || ''}
                  onChange={(e) => setCrawl4aiConfig({ ...crawl4aiConfig!, url: e.target.value })}
                  onBlur={saveCrawl4AIConfig}
                  style={{ flex: 1, minWidth: '200px' }}
                  disabled={!crawl4aiConfig}
                />
                <label className="toggle" style={{ marginLeft: '12px' }}>
                  <input
                    type="checkbox"
                    checked={crawl4aiConfig?.enabled || false}
                    onChange={(e) => {
                      setCrawl4aiConfig({ ...crawl4aiConfig!, enabled: e.target.checked });
                      saveCrawl4AIConfig();
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <p className="config-hint" style={{ fontSize: '13px', color: crawl4aiMessage?.includes('成功') ? 'var(--success)' : 'var(--foreground-muted)', margin: 0 }}>
                {crawl4aiMessage || (
                  <>
                    <a href="https://github.com/unclecode/crawl4ai" target="_blank" rel="noopener noreferrer">
                      安装指南
                    </a>
                    &nbsp;· Docker: <code style={{ background: 'var(--background-subtle)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>docker run -p 11235:11235 unclecode/crawl4ai</code>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
