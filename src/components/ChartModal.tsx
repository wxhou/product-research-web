/**
 * 图表模态框组件
 *
 * 用于显示放大的图表，支持下载功能
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartContent: React.ReactNode;
  chartId: string;
  chartCode?: string;
  onRetry?: () => void;
  onEdit?: (newCode: string) => void;
}

export function ChartModal({
  isOpen,
  onClose,
  chartContent,
  chartId,
  chartCode,
  onRetry,
  onEdit,
}: ChartModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 点击遮罩层关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 下载图表为 PNG
  const handleDownloadPNG = async () => {
    const svgElement = modalRef.current?.querySelector('svg');
    if (!svgElement) {
      alert('未找到图表元素');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        alert('无法创建画布上下文');
        return;
      }
      const img = new Image();

      // 设置 2x 分辨率
      const width = svgElement.clientWidth || 800;
      const height = svgElement.clientHeight || 600;
      canvas.width = width * 2;
      canvas.height = height * 2;

      img.src = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(svgData));

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${chartId}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pngUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    }
  };

  // 下载图表为 SVG
  const handleDownloadSVG = () => {
    if (!chartCode) {
      alert('无法获取图表代码');
      return;
    }

    const blob = new Blob([chartCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chartId}-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 开始编辑
  const startEdit = () => {
    if (chartCode) {
      setEditedCode(chartCode);
      setIsEditing(true);
    }
  };

  // 保存编辑
  const saveEdit = () => {
    if (onEdit && editedCode) {
      onEdit(editedCode);
      setIsEditing(false);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setIsEditing(false);
    setEditedCode('');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="chart-modal-overlay" onClick={handleOverlayClick}>
      <div className="chart-modal" ref={modalRef}>
        <div className="chart-modal-header">
          <span className="chart-modal-title">图表预览</span>
          <div className="chart-modal-actions">
            {!isEditing && onEdit && (
              <button className="chart-action-btn" onClick={startEdit} title="编辑">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <button className="chart-action-btn" onClick={handleDownloadSVG} title="下载 SVG">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button className="chart-action-btn" onClick={handleDownloadPNG} title="下载 PNG">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button className="chart-close-btn" onClick={onClose} title="关闭 (ESC)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="chart-modal-body">
          {isEditing ? (
            <div className="chart-editor">
              <textarea
                className="chart-code-editor"
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                spellCheck={false}
              />
              <div className="chart-editor-actions">
                <button className="btn btn-secondary" onClick={cancelEdit}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={saveEdit}>
                  应用
                </button>
              </div>
            </div>
          ) : (
            <div className="chart-content">
              {chartContent}
            </div>
          )}
        </div>

        {onRetry && !isEditing && (
          <div className="chart-modal-footer">
            <button className="btn btn-secondary" onClick={onRetry}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              重新渲染
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .chart-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 2rem;
        }

        .chart-modal {
          background: var(--background-primary);
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .chart-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }

        .chart-modal-title {
          font-weight: 600;
          color: var(--foreground);
        }

        .chart-modal-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .chart-action-btn,
        .chart-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: var(--background-subtle);
          color: var(--foreground-muted);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .chart-action-btn:hover,
        .chart-close-btn:hover {
          background: var(--background-secondary);
          color: var(--foreground);
        }

        .chart-close-btn:hover {
          background: var(--error-light);
          color: var(--error);
        }

        .chart-modal-body {
          flex: 1;
          overflow: auto;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }

        .chart-content {
          width: 100%;
          overflow: auto;
        }

        .chart-modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: center;
        }

        .chart-editor {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chart-code-editor {
          width: 100%;
          min-height: 200px;
          padding: 1rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--background-secondary);
          color: var(--foreground);
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 13px;
          resize: vertical;
        }

        .chart-editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        @media print {
          .chart-modal-overlay {
            display: none;
          }
        }
      `}</style>
    </div>
  );

  // 使用 React Portal 渲染到 body
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

export default ChartModal;
