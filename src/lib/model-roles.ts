import { settingsDb } from './db';

// 模型角色配置接口
export interface ModelRoleConfig {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
}

export interface ModelRolesConfig {
  analyzer: ModelRoleConfig;
  extractor: ModelRoleConfig;
  reporter: ModelRoleConfig;
}

// 读取模型角色配置
export function getModelRolesConfig(): ModelRolesConfig | null {
  try {
    const result = settingsDb.get.get({ key: 'model_roles_config' }) as { value: string } | undefined;
    if (result?.value) {
      return JSON.parse(result.value);
    }
    return null;
  } catch (error) {
    console.error('Failed to get model roles config:', error);
    return null;
  }
}

// 获取指定角色的模型配置
export function getModelConfig(role: 'analyzer' | 'extractor' | 'reporter'): ModelRoleConfig | null {
  const config = getModelRolesConfig();
  if (!config) return null;
  return config[role] || null;
}

// 获取指定角色的模型名称
export function getModelForRole(role: 'analyzer' | 'extractor' | 'reporter'): string {
  const config = getModelConfig(role);
  return config?.model || '';
}

// 获取指定角色的 API 地址
export function getBaseUrlForRole(role: 'analyzer' | 'extractor' | 'reporter'): string {
  const config = getModelConfig(role);
  return config?.baseUrl || '';
}

// 获取指定角色的 API Key
export function getApiKeyForRole(role: 'analyzer' | 'extractor' | 'reporter'): string {
  const config = getModelConfig(role);
  return config?.apiKey || '';
}

// 检查指定角色是否配置了独立模型
export function hasCustomModel(role: 'analyzer' | 'extractor' | 'reporter'): boolean {
  const config = getModelConfig(role);
  return !!(config?.model && config.model.trim() !== '');
}
