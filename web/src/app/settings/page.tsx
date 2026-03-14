'use client';

import { useState, useEffect, useCallback } from 'react';
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
  void MODEL_OPTIONS;
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
    maxTokens?: number;
    enableStructuredOutput?: boolean;
  } | null>(null);
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModelName, setLlmModelName] = useState('');
  const [llmTemperature, setLlmTemperature] = useState(0.7);
  const [llmTimeout, setLlmTimeout] = useState(120);
  const [llmMaxTokens, setLlmMaxTokens] = useState(262144);
  const [llmStructuredOutput, setLlmStructuredOutput] = useState(true);
  const [llmSaving, setLlmSaving] = useState(false);

  // 报告质量设置状态
  const [qualitySettings, setQualitySettings] = useState({
    autoCheck: true,
    autoKeywords: true,
    autoReferences: true,
    consistencyCheck: true,
    iterativeOptimization: false,
    enableROI: false,
    enableImplementation: false,
    minQualityScore: 65,
  });
  const [qualitySaving, setQualitySaving] = useState(false);

  const router = useRouter();
  const { isAdmin, isAuthenticated, loading: authLoading } = useAuth();

  // 权限检查
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  const fetchDataSources = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDataSources();
      fetchLLMConfig();
      fetchQualitySettings();
    }
  }, [isAuthenticated, fetchDataSources]);

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
        setLlmMaxTokens(config.maxTokens ?? 262144);
        setLlmStructuredOutput(config.enableStructuredOutput ?? true);
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
        maxTokens: llmMaxTokens,
        enableStructuredOutput: llmStructuredOutput,
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

  // 获取质量设置
  const fetchQualitySettings = async () => {
    try {
      const res = await fetch('/api/settings/quality');
      const data = await res.json();
      if (data.success && data.data) {
        setQualitySettings({
          autoCheck: data.data.autoCheck ?? true,
          autoKeywords: data.data.autoKeywords ?? true,
          autoReferences: data.data.autoReferences ?? true,
          consistencyCheck: data.data.consistencyCheck ?? true,
          iterativeOptimization: data.data.iterativeOptimization ?? false,
          enableROI: data.data.enableROI ?? false,
          enableImplementation: data.data.enableImplementation ?? false,
          minQualityScore: data.data.qualityGate?.minQualityScore ?? 65,
        });
      }
    } catch (error) {
      console.error('Failed to fetch quality settings:', error);
    }
  };

  // 保存质量设置
  const saveQualitySettings = async () => {
    setQualitySaving(true);
    try {
      const config = {
        autoCheck: qualitySettings.autoCheck,
        autoKeywords: qualitySettings.autoKeywords,
        autoReferences: qualitySettings.autoReferences,
        consistencyCheck: qualitySettings.consistencyCheck,
        iterativeOptimization: qualitySettings.iterativeOptimization,
        enableROI: qualitySettings.enableROI,
        enableImplementation: qualitySettings.enableImplementation,
        qualityGate: {
          enabled: qualitySettings.autoCheck,
          minQualityScore: qualitySettings.minQualityScore,
          skippedChecks: [],
          consistency: {
            checkDuplicateMetrics: qualitySettings.consistencyCheck,
            checkPercentageOverflow: qualitySettings.consistencyCheck,
            checkLogicalContradictions: qualitySettings.consistencyCheck,
            enableLLMDetection: qualitySettings.consistencyCheck,
          },
          structural: {
            enabled: true,
            requiredSections: ['执行摘要', '市场分析', '竞争格局', '功能分析', 'SWOT分析', '战略建议'],
            minSectionLength: 300,
            missingSectionPenalty: 20,
            insufficientContentPenalty: 10,
          },
          depth: {
            enabled: true,
            minDataPoints: 5,
            requireComparison: true,
            requireTrend: false,
          },
        },
      };
      const res = await fetch('/api/settings/quality', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', '质量设置保存成功');
      } else {
        showMessage('error', '保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to save quality settings:', error);
      showMessage('error', '保存失败');
    } finally {
      setQualitySaving(false);
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
    } catch {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                className="input"
                id="timeout"
                min="30"
                max="300"
                value={llmTimeout}
                onChange={(e) => setLlmTimeout(parseInt(e.target.value) || 120)}
                style={{ width: '80px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>秒</span>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <div>
                <h3>最大输出 Tokens</h3>
                <p>LLM 输出的最大 token 数</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                className="input"
                id="maxTokens"
                min="256"
                max="262144"
                value={llmMaxTokens}
                onChange={(e) => setLlmMaxTokens(parseInt(e.target.value) || 262144)}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>tokens</span>
            </div>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="M4.93 4.93l2.83 2.83" />
                  <path d="M16.24 16.24l2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="M4.93 19.07l2.83-2.83" />
                  <path d="M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <div>
                <h3>结构化输出开关</h3>
                <p>JSON 任务自动启用 response_format，不支持时自动回退</p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={llmStructuredOutput}
                onChange={(e) => setLlmStructuredOutput(e.target.checked)}
              />
              <span style={{ fontSize: '12px', color: '#666' }}>
                {llmStructuredOutput ? '已开启' : '已关闭'}
              </span>
            </label>
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
        </div>
      </section>

      {/* 报告质量设置 */}
      <section className="settings-section">
        <div className="section-header">
          <div className="section-info">
            <h2>报告质量</h2>
            <p>配置报告自动质量检查和增强功能</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={saveQualitySettings}
            disabled={qualitySaving}
          >
            {qualitySaving ? '保存中...' : '保存设置'}
          </button>
        </div>

        <div className="settings-group">
          <h3>自动增强</h3>
          <p className="group-desc">报告生成时自动添加的内容</p>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3>自动提取关键词</h3>
                <p>报告生成后自动提取核心技术术语作为关键词</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.autoKeywords}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, autoKeywords: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3>自动提取参考文献</h3>
                <p>根据报告中的引用标注自动生成参考文献列表</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.autoReferences}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, autoReferences: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-group">
          <h3>质量检查</h3>
          <p className="group-desc">报告生成后的质量验证</p>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3>启用质量检查</h3>
                <p>自动检查报告的结构完整性、分析深度等</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.autoCheck}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, autoCheck: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3>数据一致性检查</h3>
                <p>检测报告中的数据矛盾、百分比溢出等问题</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.consistencyCheck}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, consistencyCheck: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <h3>迭代优化</h3>
                <p>根据质量评分自动迭代优化报告内容</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.iterativeOptimization}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, iterativeOptimization: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 7h8m0 0v8m0-8l-8 4-6 8-4-6" />
                </svg>
              </div>
              <div>
                <h3>最低质量分数</h3>
                <p>质量门禁阈值，低于此分数将提示改进</p>
              </div>
            </div>
            <input
              type="number"
              className="input number-input"
              value={qualitySettings.minQualityScore}
              onChange={(e) => setQualitySettings(prev => ({ ...prev, minQualityScore: parseInt(e.target.value) || 65 }))}
              min={0}
              max={100}
              style={{ width: '80px' }}
            />
          </div>
        </div>

        <div className="settings-group">
          <h3>高级分析</h3>
          <p className="group-desc">可选的高级报告增强功能（需要更长生成时间）</p>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3>ROI 分析</h3>
                <p>自动计算投资回报率和敏感性分析</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.enableROI}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, enableROI: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="preference-item">
            <div className="preference-info">
              <div className="preference-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3>实施计划</h3>
                <p>自动生成MVP定义、里程碑和资源配置建议</p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={qualitySettings.enableImplementation}
                onChange={(e) => setQualitySettings(prev => ({ ...prev, enableImplementation: e.target.checked }))}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
