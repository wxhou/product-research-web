## Why

当前报告页面功能单一，用户在阅读长报告时面临以下问题：
1. 缺乏导航辅助，难以快速定位和回溯内容
2. Mermaid 图表无法放大查看细节，渲染失败时仅显示错误代码
3. 打印/导出时格式错乱，无法直接生成 PDF 报告
4. 空状态页面缺乏引导，用户不知道如何创建报告

这些体验问题降低了报告的可用性和专业感，需要系统性地提升报告页面的交互体验。

## What Changes

### 新增功能
- **目录导航**：右侧固定 TOC，显示当前阅读位置，点击可跳转
- **阅读进度条**：顶部显示阅读进度百分比
- **图表交互**：支持图表放大模态框、下载为图片
- **图表错误处理**：渲染失败时显示优雅降级 UI，支持手动编辑
- **打印优化**：专用的打印样式，优化分页和图表显示
- **代码块优化**：支持语法高亮主题切换、一键复制

### 改进现有功能
- **报告头部**：增加关键词标签显示、数据来源链接
- **导航面包屑**：增加章节快速跳转下拉菜单
- **空状态页面**：添加插图和引导操作按钮

### 破坏性变更
无

## Capabilities

### New Capabilities
- `report-navigation`: 报告页面导航增强，包括目录导航、阅读进度、面包屑导航
- `chart-interaction`: 图表交互功能，包括放大模态框、下载、错误处理
- `report-print-export`: 打印和导出优化，支持 PDF 导出样式
- `report-empty-state`: 空状态优化，包括插图和引导操作

### Modified Capabilities
- 无（现有 research-report 能力的需求未变，仅增强 UI/UX）

## Impact

- `src/components/ReportViewer.tsx`：主要修改文件，添加导航和交互组件
- `src/components/ReportTableOfContents.tsx`：新增目录导航组件
- `src/components/ChartModal.tsx`：新增图表放大模态框组件
- `src/app/globals.css`：添加打印样式、进度条样式、模态框样式
- `package.json`：可能需要添加图表下载相关依赖
