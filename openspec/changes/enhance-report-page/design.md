## Context

当前 ReportViewer.tsx 是一个相对简单的报告渲染组件，核心功能包括：
- 使用 react-markdown 渲染 Markdown 内容
- 使用 mermaid.js 渲染图表
- 基础的复制和下载功能
- 简单的加载/空状态展示

问题：
- 长报告缺乏导航，用户难以快速定位
- Mermaid 图表不支持交互操作
- 打印时样式错乱
- 组件职责不清晰，代码耦合度高

## Goals / Non-Goals

### Goals
1. 添加目录导航和阅读进度，提升长报告阅读体验
2. 支持图表交互（放大、下载、错误处理）
3. 优化打印样式，支持 PDF 导出
4. 提升组件可维护性，拆分职责

### Non-Goals
- 不修改后端 API 或数据格式
- 不支持多人协作编辑
- 不实现报告版本管理
- 不添加评论或批注功能

## Decisions

### D1: 组件架构 - 容器+展示模式

**决定**：采用容器组件（ReportViewer） + 子展示组件（TOC, Progress, ChartModal）模式

**理由**：
- 单一组件代码量已达 350+ 行，需要拆分
- 各功能独立，便于维护和测试
- 复用子组件到其他页面（如项目详情）

**备选方案**：
- 状态提升到父组件（增加父组件复杂度）
- 使用 Context API（引入 Provider 嵌套）

### D2: 目录导航 - IntersectionObserver 实现

**决定**：使用 IntersectionObserver API 监听标题元素位置

**理由**：
- 原生 API，性能好（不频繁触发）
- 可精确获取当前阅读位置
- 浏览器兼容性良好（IE11+）

**实现要点**：
```typescript
// 提取所有 h2/h3 标题
const headings = container.querySelectorAll('h2, h3');

// 监听器配置
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      setActiveId(entry.target.id);
    }
  });
}, { rootMargin: '-20% 0px -80% 0px' });
```

**备选方案**：
- scroll 事件（性能差，需要节流）
- 第三方库如 scrollSpy（增加依赖）

### D3: 阅读进度 - scroll 事件计算

**决定**：使用 scroll Y 位置 + 内容高度计算进度百分比

**理由**：
- 计算简单直观
- 可以平滑动画展示

**实现**：
```typescript
const progress = useMemo(() => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
}, [scrollY]);
```

### D4: 图表模态框 - React Portal 实现

**决定**：使用 React Portal 将模态框渲染到 body 下

**理由**：
- 避免 z-index 层级冲突
- 脱离父组件样式影响
- 便于全局关闭（Escape 键）

**实现**：
```typescript
// ChartModal.tsx
return createPortal(
  <div className="chart-modal-overlay" onClick={onClose}>
    <div className="chart-modal-content" onClick={e => e.stopPropagation()}>
      <button className="close-btn" onClick={onClose}>×</button>
      <div className="chart-container" ref={chartRef} />
    </div>
  </div>,
  document.body
);
```

### D5: 图表下载 - SVG 转 PNG

**决定**：使用 canvas API 将 SVG 转为 PNG 下载

**理由**：
- 无需额外依赖
- 兼容性好

**实现**：
```typescript
async function downloadChart(svgElement: SVGSVGElement, filename: string) {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  await img.onload;
  canvas.width = svgElement.clientWidth * 2; // 2x 清晰度
  canvas.height = svgElement.clientHeight * 2;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pngUrl = canvas.toDataURL('image/png');
  // 触发下载...
}
```

### D6: 打印样式 - CSS @media print

**决定**：使用 CSS @media print 规则优化打印

**理由**：
- 无需额外 JS
- 浏览器原生支持
- 保持样式与页面一致

**打印样式要点**：
```css
@media print {
  /* 隐藏导航、按钮 */
  .toc-sidebar, .header-actions, .progress-bar { display: none; }

  /* 图表适应页面 */
  .mermaid-chart { break-inside: avoid; page-break-inside: avoid; }

  /* 链接显示 URL */
  a[href]:after { content: " (" attr(href) ")"; }

  /* 纸张边距 */
  @page { margin: 2cm; }
}
```

### D7: 组件文件结构

```
src/components/
├── ReportViewer.tsx      # 容器组件，状态管理
├── ReportTableOfContents.tsx  # 目录导航
├── ReportProgressBar.tsx      # 阅读进度条
├── ChartModal.tsx            # 图表放大模态框
└── ReportEmptyState.tsx       # 空状态组件
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| IntersectionObserver 兼容性 | IE11 不支持 | 添加 polyfill 或降级方案 |
| Mermaid 渲染性能 | 大型图表卡顿 | 懒加载、虚拟滚动 |
| 打印样式兼容性 | 部分浏览器差异 | 测试 Chrome/Safari/Firefox |
| 模态框 z-index 冲突 | 被其他元素遮挡 | 使用 Portal + 固定最高层级 |

## Migration Plan

### Phase 1: 基础结构拆分
1. 创建 ReportTableOfContents 组件
2. 创建 ReportProgressBar 组件
3. 重构 ReportViewer 为容器

### Phase 2: 目录导航
1. 实现标题提取和 ID 注入
2. 实现 IntersectionObserver 监听
3. 集成 TOC 到 ReportViewer

### Phase 3: 阅读进度
1. 实现进度计算逻辑
2. 添加进度条 UI
3. 集成到 ReportViewer

### Phase 4: 图表交互
1. 创建 ChartModal 组件
2. 修改 mermaid 渲染逻辑支持点击打开模态框
3. 添加下载功能

### Phase 5: 打印优化
1. 添加 @media print 样式
2. 测试打印效果

## Open Questions

1. **目录深度限制**：是否只显示 h2，还是包含 h3/h4？
   - 建议：只显示 h2，保持目录简洁

2. **进度条位置**：顶部固定还是跟随内容？
   - 建议：顶部固定，用户体验更一致

3. **图表下载格式**：PNG 还是 SVG？
   - 建议：PNG 更通用，保留 SVG 选项

4. **是否需要打印按钮**？
   - 建议：添加到 header-actions，与下载按钮并列
