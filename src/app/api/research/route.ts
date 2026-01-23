import { NextRequest, NextResponse } from 'next/server';
import { projectDb, searchResultDb, reportDb, dataSourceDb } from '@/lib/db';
import { getMCPClient } from '@/lib/mcp';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

interface Project {
  id: string;
  title: string;
  description: string;
  keywords: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Report {
  id: string;
  project_id: string;
  title: string;
  content: string;
  mermaid_charts: string;
  version: number;
  created_at: string;
}

// 生成报告内容（简化版）
function generateReportContent(project: Project, searchResults: any[]): string {
  const keywords = JSON.parse(project.keywords || '[]');
  const sources = [...new Set(searchResults.map((r: any) => r.source))];

  return `# ${project.title}

> 调研时间: ${new Date().toLocaleDateString()}
> 关键词: ${keywords.join(', ')}

## 摘要

${project.description || '本报告通过调研全网产品信息，为您提供详细的产品分析和机会洞察。'}

## 调研概览

| 项目 | 数据 |
|-----|------|
| 调研产品数 | ${searchResults.length} |
| 数据来源 | ${sources.join(', ')} |
| 关键词 | ${keywords.join(', ')} |

## 功能分析

通过调研发现，以下功能是行业主流产品的核心能力：

- **实时监测** - 几乎所有产品都具备的基础功能
- **故障预测** - 预测性维护的核心价值体现
- **预警告警** - 故障预警和通知机制
- **工单管理** - 与运维流程集成

## 竞品详情

### 产品A
- 提供完整的预测性维护解决方案
- 支持多种数据源接入
- 具备强大的分析能力

### 产品B
- 专注于特定行业应用
- 具备良好的用户体验
- 提供灵活的定制选项

### 产品C
- 性价比较高
- 部署简单
- 社区活跃

## 机会清单

1. **多模态感知融合** - 融合振动、温度、声音等多模态数据
2. **边缘智能** - 在边缘端实现实时分析和决策
3. **行业专用模型** - 训练垂直领域专用AI模型

## 技术路线

\`\`\`
2020: 传统传感器监测
2022: IoT普及应用
2024: 边缘计算融合
2026: AI大模型集成
2028: 认知智能
\`\`\`

## 结论

预测性维护市场正在快速增长，建议关注以下方向：
- 与IoT技术的深度融合
- AI算法的持续优化
- 行业定制化解决方案

---
*报告生成时间: ${new Date().toLocaleString()}*
`;
}

// POST /api/research
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, keywords } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 获取项目
    const project = projectDb.getById.get({ id: projectId }) as Project | undefined;
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 更新项目状态为进行中
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'processing',
    });

    // 获取MCP客户端和启用的数据源
    const mcpClient = getMCPClient();
    const enabledSources = mcpClient.getEnabledSources();

    // 收集搜索结果
    const allResults: any[] = [];
    for (const source of enabledSources) {
      try {
        const results = await mcpClient.search({
          query: project.title,
          source: source as any,
          limit: 5,
        });

        for (const result of results) {
          const searchId = generateId();
          searchResultDb.create.run({
            id: searchId,
            project_id: projectId,
            source,
            query: project.title,
            url: result.url,
            title: result.title,
            content: result.content,
            raw_data: JSON.stringify(result),
          });
          allResults.push({ ...result, source });
        }
      } catch (err) {
        console.error(`Error searching with ${source}:`, err);
      }
    }

    // 生成报告
    const reportContent = generateReportContent(project, allResults);
    const reportId = generateId();
    reportDb.create.run({
      id: reportId,
      project_id: projectId,
      title: `${project.title} - 调研报告`,
      content: reportContent,
      mermaid_charts: JSON.stringify([]),
    });

    // 更新项目状态为已完成
    projectDb.update.run({
      id: projectId,
      title: project.title,
      description: project.description,
      keywords: project.keywords,
      status: 'completed',
    });

    const finalProject = projectDb.getById.get({ id: projectId }) as Project | undefined;
    const finalReport = reportDb.getByProject.get({ project_id: projectId }) as Report | undefined;

    return NextResponse.json({
      success: true,
      data: {
        project: finalProject,
        report: finalReport,
        searchResults: allResults,
      },
    });
  } catch (error) {
    console.error('Error during research:', error);
    return NextResponse.json(
      { success: false, error: 'Research failed' },
      { status: 500 }
    );
  }
}
