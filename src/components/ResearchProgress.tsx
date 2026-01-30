/**
 * 详细进度展示组件
 *
 * 展示研究任务的多阶段进度，包括：
 * - 当前阶段指示器
 * - 各阶段完成状态
 * - 当前步骤详情
 * - 进度百分比
 */

"use client";

import { useMemo } from 'react';

// 进度详情类型
interface ProgressDetail {
  stage: string;
  step: string;
  totalItems: number;
  completedItems: number;
  currentItem: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

// 阶段配置
interface StageConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  baseProgress: number;
  maxProgress: number;
}

const STAGES: StageConfig[] = [
  {
    id: 'planner',
    label: '规划',
    baseProgress: 0,
    maxProgress: 20,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'searcher',
    label: '搜索',
    baseProgress: 20,
    maxProgress: 40,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: 'extractor',
    label: '提取',
    baseProgress: 40,
    maxProgress: 60,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    id: 'analyzer',
    label: '分析',
    baseProgress: 60,
    maxProgress: 80,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    id: 'reporter',
    label: '报告',
    baseProgress: 80,
    maxProgress: 100,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M12 18v-6M9 15h6" />
      </svg>
    ),
  },
];

// 获取阶段状态样式
function getStageStatus(stageId: string, currentStage: string, isCompleted: boolean): {
  status: 'completed' | 'active' | 'pending';
  color: string;
} {
  if (isCompleted || stageId === 'reporter') {
    const stageOrder = STAGES.map((s) => s.id);
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageId);

    if (stageIndex < currentIndex) {
      return { status: 'completed', color: 'var(--success)' };
    } else if (stageIndex === currentIndex) {
      return { status: 'active', color: 'var(--info)' };
    }
  } else if (stageId === currentStage) {
    return { status: 'active', color: 'var(--info)' };
  }

  return { status: 'pending', color: 'var(--text-muted)' };
}

// 计算阶段内进度
function calculateStageProgress(
  stageId: string,
  currentStage: string,
  overallProgress: number
): number {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return 0;

  const stageOrder = STAGES.map((s) => s.id);
  const currentIndex = stageOrder.indexOf(currentStage);
  const stageIndex = stageOrder.indexOf(stageId);

  if (stageIndex < currentIndex) {
    return 100;
  } else if (stageIndex > currentIndex) {
    return 0;
  }

  // 当前阶段：根据总体进度计算
  const stageRange = stage.maxProgress - stage.baseProgress;
  const progressInStage = Math.max(0, overallProgress - stage.baseProgress);
  return Math.min(Math.round((progressInStage / stageRange) * 100), 99);
}

// 格式化时间
function formatTime(seconds: number | undefined): string {
  if (!seconds) return '--';

  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}分${secs}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}时${minutes}分`;
  }
}

interface ResearchProgressProps {
  progress: ProgressDetail;
  simple?: boolean;
}

export function ResearchProgress({ progress, simple = false }: ResearchProgressProps) {
  const { stage, step, totalItems, completedItems, currentItem, percentage, estimatedTimeRemaining } = progress;

  // 计算各阶段状态
  const stageStatuses = useMemo(() => {
    return STAGES.map((s) => ({
      ...s,
      ...getStageStatus(s.id, stage, percentage === 100),
      stageProgress: calculateStageProgress(s.id, stage, percentage),
    }));
  }, [stage, percentage]);

  // 当前阶段的详细进度
  const currentStageConfig = STAGES.find((s) => s.id === stage);

  if (simple) {
    // 简单模式：只显示进度条和百分比
    return (
      <div className="research-progress-simple">
        <div className="progress-header">
          <div className="progress-icon">
            {percentage === 100 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
          </div>
          <div className="progress-info">
            <div className="progress-message">{step}</div>
            <div className="progress-percentage">{percentage}%</div>
          </div>
        </div>
        <div className="progress-bar" style={{ height: '8px' }}>
          <div
            className="progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage === 100 ? 'var(--success)' : 'var(--info)',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="research-progress">
      {/* 阶段指示器 */}
      <div className="stage-indicator">
        {stageStatuses.map((s, index) => (
          <div key={s.id} className="stage-item">
            <div
              className={`stage-icon ${s.status}`}
              style={{
                backgroundColor: s.status === 'completed' ? 'var(--success-light)' :
                  s.status === 'active' ? 'var(--info-light)' : 'var(--bg-secondary)',
                color: s.status === 'completed' ? 'var(--success)' :
                  s.status === 'active' ? 'var(--info)' : 'var(--text-muted)',
              }}
            >
              {s.status === 'completed' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : s.status === 'active' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={s.status === 'active' ? 'animate-pulse' : ''}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <span className="stage-number">{index + 1}</span>
              )}
            </div>
            <span className={`stage-label ${s.status}`}>{s.label}</span>
            {index < stageStatuses.length - 1 && (
              <div className={`stage-connector ${s.status}`} />
            )}
          </div>
        ))}
      </div>

      {/* 总体进度 */}
      <div className="overall-progress">
        <div className="progress-bar" style={{ height: '10px' }}>
          <div
            className="progress-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: percentage === 100 ? 'var(--success)' : 'var(--info)',
            }}
          />
        </div>
        <div className="progress-labels">
          <span className="progress-percentage">{percentage}%</span>
          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <span className="estimated-time">预计剩余: {formatTime(estimatedTimeRemaining)}</span>
          )}
        </div>
      </div>

      {/* 当前阶段详情 */}
      {currentStageConfig && (
        <div className="current-stage-detail">
          <div className="stage-header">
            <div className="stage-icon-small" style={{ color: 'var(--info)' }}>
              {currentStageConfig.icon}
            </div>
            <div className="stage-info">
              <span className="stage-title">{currentStageConfig.label}阶段</span>
              <span className="stage-step">{step}</span>
            </div>
          </div>

          {/* 阶段内进度 */}
          <div className="stage-progress-detail">
            <div className="progress-stats">
              <div className="stat">
                <span className="stat-value">{completedItems}</span>
                <span className="stat-label">已完成</span>
              </div>
              <div className="stat-divider">/</div>
              <div className="stat">
                <span className="stat-value">{totalItems}</span>
                <span className="stat-label">总数</span>
              </div>
            </div>
            <div className="progress-bar" style={{ height: '6px', backgroundColor: 'var(--bg-secondary)' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`,
                  backgroundColor: 'var(--info)',
                }}
              />
            </div>
            {currentItem && (
              <div className="current-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>{currentItem}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResearchProgress;
