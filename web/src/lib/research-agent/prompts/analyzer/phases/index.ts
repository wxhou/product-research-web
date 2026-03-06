/**
 * 分析阶段提示词汇总
 */

export { PHASE_FEATURE_PROMPT } from './feature';
export { PHASE_COMPETITOR_PROMPT } from './competitor';
export { PHASE_SWOT_PROMPT } from './swot';
export { PHASE_MARKET_PROMPT } from './market';
export { PHASE_USECASE_PROMPT } from './usecase';
export { PHASE_TECH_PROMPT } from './tech';
export { PHASE_STRATEGY_PROMPT } from './strategy';

/**
 * 阶段配置
 */
export interface AnalysisPhaseConfig {
  id: string;
  name: string;
  enabled: boolean;
}

/**
 * 默认阶段配置
 */
export const DEFAULT_PHASES: AnalysisPhaseConfig[] = [
  { id: 'feature', name: '功能分析', enabled: true },
  { id: 'competitor', name: '竞品分析', enabled: true },
  { id: 'swot', name: 'SWOT 分析', enabled: true },
  { id: 'market', name: '市场分析', enabled: true },
  { id: 'usecase', name: '场景分析', enabled: true },
  { id: 'tech', name: '技术栈分析', enabled: true },
  { id: 'strategy', name: '战略建议', enabled: true },
];
