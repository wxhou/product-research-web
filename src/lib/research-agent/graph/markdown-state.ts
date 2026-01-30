/**
 * Markdown 状态管理器
 *
 * 将 ResearchState 序列化为 Markdown + Frontmatter 格式
 */

import type { ResearchState } from '../state';
import type { SearchResult, ExtractionResult, AnalysisResult, Citation, SearchPlan, SearchQuery } from '../types';

// ============================================================
// 类型定义
// ============================================================

/**
 * Markdown 状态文件格式
 */
export interface MarkdownStateFile {
  /** Frontmatter 元数据 */
  metadata: StateMetadata;
  /** 搜索结果表格 */
  searchResults: string;
  /** 提取内容 */
  extractedContent: string;
  /** 分析结果 */
  analysis: string;
  /** 引用列表 */
  citations: string;
}

/**
 * 状态元数据
 */
export interface StateMetadata {
  projectId: string;
  title: string;
  status: string;
  currentStep: string;
  progress: number;
  progressMessage: string;
  iterationsUsed: number;
  totalSearches: number;
  totalResults: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  /** 搜索计划 */
  searchPlan?: SearchPlan;
  /** 待执行查询 */
  pendingQueries?: SearchQuery[];
  /** SHA-256 校验和 */
  checksum?: string;
}

/**
 * 状态管理器配置
 */
export interface StateManagerConfig {
  /** 状态文件目录 */
  stateDir: string;
  /** 是否启用压缩 */
  enableCompression: boolean;
  /** 最大文件大小（字节） */
  maxFileSize: number;
}

/**
 * 状态读写选项
 */
export interface StateReadOptions {
  /** 是否包含提取内容 */
  includeExtractedContent: boolean;
  /** 是否包含分析结果 */
  includeAnalysis: boolean;
  /** 最大提取内容长度 */
  maxExtractionLength: number;
}

export interface StateWriteOptions {
  /** 是否添加时间戳 */
  addTimestamp: boolean;
  /** 是否计算校验和 */
  computeChecksum: boolean;
  /** 最大提取内容长度 */
  maxExtractionLength: number;
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: StateManagerConfig = {
  stateDir: 'task-data',
  enableCompression: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

const DEFAULT_READ_OPTIONS: StateReadOptions = {
  includeExtractedContent: true,
  includeAnalysis: true,
  maxExtractionLength: 10000,
};

const DEFAULT_WRITE_OPTIONS: StateWriteOptions = {
  addTimestamp: true,
  computeChecksum: true,
  maxExtractionLength: 10000,
};

// ============================================================
// Markdown 状态管理器
// ============================================================

/**
 * Markdown 状态管理器
 */
export class MarkdownStateManager {
  private config: StateManagerConfig;
  private fs: typeof import('fs');
  private path: typeof import('path');

  constructor(config?: Partial<StateManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fs = require('fs');
    this.path = require('path');
  }

  /**
   * 获取状态文件路径
   */
  getStateFilePath(projectId: string): string {
    return this.path.join(this.config.stateDir, `${projectId}-state.md`);
  }

  /**
   * 读取状态
   */
  async readState(
    projectId: string,
    options?: Partial<StateReadOptions>
  ): Promise<ResearchState | null> {
    const filePath = this.getStateFilePath(projectId);
    const opts = { ...DEFAULT_READ_OPTIONS, ...options };

    if (!this.fs.existsSync(filePath)) {
      console.warn(`[StateManager] State file not found: ${filePath}`);
      return null;
    }

    try {
      const content = this.fs.readFileSync(filePath, 'utf-8');
      return this.parseState(content, opts);
    } catch (error) {
      console.error(`[StateManager] Failed to read state: ${error}`);
      return null;
    }
  }

  /**
   * 写入状态
   */
  async writeState(
    state: ResearchState,
    options?: Partial<StateWriteOptions>
  ): Promise<boolean> {
    const filePath = this.getStateFilePath(state.projectId);
    const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };

    try {
      // 确保目录存在
      const dir = this.path.dirname(filePath);
      if (!this.fs.existsSync(dir)) {
        this.fs.mkdirSync(dir, { recursive: true });
      }

      // 生成 Markdown 内容
      const content = this.generateStateMarkdown(state, opts);

      // 写入文件
      this.fs.writeFileSync(filePath, content, 'utf-8');

      console.log(`[StateManager] State saved: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[StateManager] Failed to write state: ${error}`);
      return false;
    }
  }

  /**
   * 检查状态文件是否存在
   */
  exists(projectId: string): boolean {
    return this.fs.existsSync(this.getStateFilePath(projectId));
  }

  /**
   * 删除状态文件
   */
  async deleteState(projectId: string): Promise<boolean> {
    const filePath = this.getStateFilePath(projectId);

    if (!this.fs.existsSync(filePath)) {
      return false;
    }

    try {
      this.fs.unlinkSync(filePath);
      console.log(`[StateManager] State deleted: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`[StateManager] Failed to delete state: ${error}`);
      return false;
    }
  }

  /**
   * 列出所有状态文件
   */
  listStates(): string[] {
    if (!this.fs.existsSync(this.config.stateDir)) {
      return [];
    }

    const files = this.fs.readdirSync(this.config.stateDir);
    return files
      .filter((f) => f.endsWith('-state.md'))
      .map((f) => f.replace('-state.md', ''));
  }

  /**
   * 生成状态 Markdown
   */
  private generateStateMarkdown(
    state: ResearchState,
    options: StateWriteOptions
  ): string {
    const metadata = this.createMetadata(state, options);

    // 构建内容
    let content = this.generateFrontmatter(metadata);

    // 添加进度信息
    content += this.generateProgressSection(state);

    // 添加搜索结果
    content += this.generateSearchResultsSection(state.searchResults);

    // 添加提取内容
    if (state.extractedContent.length > 0) {
      content += this.generateExtractedContentSection(state.extractedContent, options.maxExtractionLength);
    }

    // 添加分析结果
    if (state.analysis) {
      content += this.generateAnalysisSection(state.analysis);
    }

    // 添加引用
    if (state.citations.length > 0) {
      content += this.generateCitationsSection(state.citations);
    }

    return content;
  }

  /**
   * 创建元数据
   */
  private createMetadata(
    state: ResearchState,
    options: StateWriteOptions
  ): StateMetadata {
    const metadata: StateMetadata = {
      projectId: state.projectId,
      title: state.title,
      status: state.status,
      currentStep: state.currentStep,
      progress: state.progress,
      progressMessage: state.progressMessage,
      iterationsUsed: state.iterationsUsed,
      totalSearches: state.totalSearches,
      totalResults: state.totalResults,
      startedAt: state.startedAt,
      updatedAt: options.addTimestamp ? new Date().toISOString() : state.updatedAt,
      completedAt: state.completedAt,
      searchPlan: state.searchPlan,
      pendingQueries: state.pendingQueries,
    };

    // 计算校验和
    if (options.computeChecksum) {
      metadata.checksum = this.computeChecksum(metadata);
    }

    return metadata;
  }

  /**
   * 生成 Frontmatter
   */
  private generateFrontmatter(metadata: StateMetadata): string {
    const frontmatter: Record<string, unknown> = {
      projectId: metadata.projectId,
      title: metadata.title,
      status: metadata.status,
      currentStep: metadata.currentStep,
      progress: metadata.progress,
      progressMessage: metadata.progressMessage,
      iterationsUsed: metadata.iterationsUsed,
      totalSearches: metadata.totalSearches,
      totalResults: metadata.totalResults,
      startedAt: metadata.startedAt,
      updatedAt: metadata.updatedAt,
      completedAt: metadata.completedAt,
      checksum: metadata.checksum,
    };

    // 添加搜索计划（如果存在）
    if (metadata.searchPlan) {
      frontmatter.searchPlan = metadata.searchPlan;
    }

    // 添加待执行查询（如果存在）
    if (metadata.pendingQueries && metadata.pendingQueries.length > 0) {
      frontmatter.pendingQueries = metadata.pendingQueries;
    }

    return `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n`;
  }

  /**
   * 生成进度部分
   */
  private generateProgressSection(state: ResearchState): string {
    return `## 研究进度

- **状态**: ${state.status}
- **当前步骤**: ${state.currentStep}
- **进度**: ${state.progress}%
- **消息**: ${state.progressMessage}
- **迭代次数**: ${state.iterationsUsed}
- **搜索次数**: ${state.totalSearches}
- **结果数量**: ${state.totalResults}
- **开始时间**: ${new Date(state.startedAt).toLocaleString('zh-CN')}
${state.completedAt ? `- **完成时间**: ${new Date(state.completedAt).toLocaleString('zh-CN')}` : ''}

`;
  }

  /**
   * 生成搜索结果部分
   */
  private generateSearchResultsSection(results: SearchResult[]): string {
    if (results.length === 0) {
      return `## 搜索结果\n\n暂无搜索结果\n\n`;
    }

    let section = `## 搜索结果 (${results.length} 条)\n\n`;

    // 生成表格
    section += `| 标题 | 来源 | 质量 | 维度 | URL |\n`;
    section += `|------|------|------|------|-----|\n`;

    for (const r of results.slice(0, 50)) {
      const title = r.title.slice(0, 40);
      const source = r.source;
      const quality = r.quality;
      const dimension = r.dimension.slice(0, 15);
      const url = `[链接](${r.url})`;
      section += `| ${title} | ${source} | ${quality} | ${dimension} | ${url} |\n`;
    }

    section += '\n';
    return section;
  }

  /**
   * 生成提取内容部分
   */
  private generateExtractedContentSection(
    extractions: ExtractionResult[],
    maxLength: number
  ): string {
    if (extractions.length === 0) {
      return `## 提取内容\n\n暂无提取内容\n\n`;
    }

    let section = `## 提取内容 (${extractions.length} 个页面)\n\n`;

    for (let i = 0; i < Math.min(extractions.length, 10); i++) {
      const ext = extractions[i];
      const content = ext.content.length > maxLength
        ? ext.content.slice(0, maxLength) + '\n...'
        : ext.content;

      section += `### ${i + 1}. ${ext.title}\n\n`;
      section += `- **URL**: [${ext.url}](${ext.url})\n`;
      section += `- **来源**: ${ext.source}\n`;
      section += `- **内容长度**: ${ext.metadata.contentLength} 字符\n`;
      section += `- **质量评分**: ${ext.metadata.qualityScore}\n`;
      section += `- **提取时间**: ${ext.metadata.crawledAt}\n`;

      if (ext.metadata.features.length > 0) {
        section += `- **功能**: ${ext.metadata.features.slice(0, 5).join(', ')}\n`;
      }
      if (ext.metadata.competitors.length > 0) {
        section += `- **竞品**: ${ext.metadata.competitors.slice(0, 5).join(', ')}\n`;
      }
      if (ext.metadata.techStack.length > 0) {
        section += `- **技术栈**: ${ext.metadata.techStack.slice(0, 5).join(', ')}\n`;
      }

      section += `\n**内容预览**:\n\n${content}\n\n---\n\n`;
    }

    return section;
  }

  /**
   * 生成分析结果部分
   */
  private generateAnalysisSection(analysis: AnalysisResult): string {
    let section = `## 分析结果\n\n`;

    // 功能统计
    section += `### 核心功能 (${analysis.features.length} 个)\n\n`;
    for (const f of analysis.features.slice(0, 10)) {
      section += `- **${f.name}**: 出现 ${f.count} 次${f.description ? ` - ${f.description}` : ''}\n`;
    }
    section += '\n';

    // 竞品分析
    section += `### 竞品分析 (${analysis.competitors.length} 个)\n\n`;
    for (const c of analysis.competitors.slice(0, 10)) {
      section += `#### ${c.name}\n`;
      section += `- **行业**: ${c.industry || '未知'}\n`;
      section += `- **定位**: ${c.marketPosition || '未知'}\n`;
      section += `- **特点**: ${c.features.slice(0, 5).join(', ') || '暂无'}\n`;
      section += `- **描述**: ${c.description || '暂无'}\n\n`;
    }

    // SWOT 分析
    section += `### SWOT 分析\n\n`;
    section += `**优势 (Strengths)**:\n`;
    for (const s of analysis.swot.strengths) {
      section += `- ${s}\n`;
    }
    section += `\n**劣势 (Weaknesses)**:\n`;
    for (const w of analysis.swot.weaknesses) {
      section += `- ${w}\n`;
    }
    section += `\n**机会 (Opportunities)**:\n`;
    for (const o of analysis.swot.opportunities) {
      section += `- ${o}\n`;
    }
    section += `\n**威胁 (Threats)**:\n`;
    for (const t of analysis.swot.threats) {
      section += `- ${t}\n`;
    }
    section += '\n';

    // 市场数据
    if (analysis.marketData) {
      section += `### 市场数据\n\n`;
      section += `- **市场规模**: ${analysis.marketData.marketSize || '未知'}\n`;
      section += `- **增长率**: ${analysis.marketData.growthRate || '未知'}\n`;
      section += `- **关键玩家**: ${analysis.marketData.keyPlayers.join(', ') || '未知'}\n`;
      section += `- **趋势**: ${analysis.marketData.trends.join(', ') || '未知'}\n\n`;
    }

    // 置信度
    section += `**分析置信度**: ${(analysis.confidenceScore * 100).toFixed(0)}%\n\n`;

    // 数据缺口
    if (analysis.dataGaps && analysis.dataGaps.length > 0) {
      section += `**数据缺口**:\n`;
      for (const gap of analysis.dataGaps) {
        section += `- ${gap}\n`;
      }
      section += '\n';
    }

    return section;
  }

  /**
   * 生成引用部分
   */
  private generateCitationsSection(citations: Citation[]): string {
    if (citations.length === 0) {
      return `## 引用来源\n\n暂无引用\n\n`;
    }

    let section = `## 引用来源 (${citations.length} 个)\n\n`;

    for (let i = 0; i < citations.length; i++) {
      const c = citations[i];
      section += `${i + 1}. [${c.title}](${c.url}) - 相关性: ${c.relevanceScore}%\n`;
    }

    section += '\n';
    return section;
  }

  /**
   * 解析状态
   */
  private parseState(
    content: string,
    options: StateReadOptions
  ): ResearchState {
    // 解析 Frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('Invalid state file format: missing frontmatter');
    }

    const metadata = JSON.parse(frontmatterMatch[1]) as StateMetadata;

    // 提取各部分内容
    const afterFrontmatter = content.replace(frontmatterMatch[0], '').trim();

    // 构建基本状态
    const state: ResearchState = {
      projectId: metadata.projectId,
      title: metadata.title,
      status: metadata.status as ResearchState['status'],
      currentStep: metadata.currentStep as ResearchState['currentStep'],
      progress: metadata.progress,
      progressMessage: metadata.progressMessage,
      progressDetail: undefined,
      iterationsUsed: metadata.iterationsUsed,
      totalSearches: metadata.totalSearches,
      totalResults: metadata.totalResults,
      searchResults: [],
      pendingQueries: metadata.pendingQueries || [],
      extractedContent: [],
      citations: [],
      startedAt: metadata.startedAt,
      updatedAt: metadata.updatedAt,
      completedAt: metadata.completedAt,
      retryCount: 0,
      maxRetries: 3,
      keywords: [],
      // 恢复搜索计划（如果存在）
      searchPlan: metadata.searchPlan,
    };

    // 解析搜索结果
    const searchResultsMatch = afterFrontmatter.match(/## 搜索结果 \((\d+) 条\)([\s\S]*?)(?=##|$)/);
    if (searchResultsMatch) {
      state.searchResults = this.parseSearchResults(searchResultsMatch[2]);
    }

    // 解析提取内容（如果需要）
    if (options.includeExtractedContent) {
      const extractionMatch = afterFrontmatter.match(/## 提取内容 \((\d+) 个页面\)([\s\S]*?)(?=##|$)/);
      if (extractionMatch) {
        state.extractedContent = this.parseExtractedContent(extractionMatch[2]);
      }
    }

    // 解析分析结果（如果需要）
    if (options.includeAnalysis) {
      const analysisMatch = afterFrontmatter.match(/## 分析结果([\s\S]*?)(?=##|$)/);
      if (analysisMatch) {
        state.analysis = this.parseAnalysis(analysisMatch[1]);
      }
    }

    // 解析引用
    const citationsMatch = afterFrontmatter.match(/## 引用来源 \((\d+) 个\)([\s\S]*?)(?=##|$)/);
    if (citationsMatch) {
      state.citations = this.parseCitations(citationsMatch[2]);
    }

    return state;
  }

  /**
   * 解析搜索结果
   */
  private parseSearchResults(content: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = content.split('\n');

    // 跳过表格头
    let inTable = false;
    for (const line of lines) {
      if (line.startsWith('|') && !inTable) {
        inTable = true;
        continue;
      }
      if (inTable && line.startsWith('|') && line.includes('---')) {
        continue;
      }
      if (inTable && line.startsWith('|') && line.trim() !== '|') {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length >= 5) {
          const title = cells[0];
          const source = cells[1];
          const quality = parseInt(cells[2], 10);
          const dimension = cells[3];
          const urlMatch = cells[4].match(/\[链接\]\((.*?)\)/);
          const url = urlMatch ? urlMatch[1] : '';

          results.push({
            id: url,
            title,
            url,
            source: source as SearchResult['source'],
            quality,
            dimension,
            crawled: false,
            queryId: '',
          });
        }
      }
    }

    return results;
  }

  /**
   * 解析提取内容
   */
  private parseExtractedContent(content: string): ExtractionResult[] {
    // 简化实现：只解析基本信息
    const extractions: ExtractionResult[] = [];

    // 这里可以扩展更详细的解析逻辑
    // 暂时返回空数组，因为提取内容较复杂

    return extractions;
  }

  /**
   * 解析分析结果
   */
  private parseAnalysis(content: string): AnalysisResult {
    // 简化实现：返回基本结构
    // 实际使用时可以从解析的文本构建更完整的对象

    const analysis: AnalysisResult = {
      features: [],
      competitors: [],
      swot: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
      marketData: {
        marketSize: '',
        growthRate: '',
        keyPlayers: [],
        trends: [],
      },
      confidenceScore: 0.5,
      dataGaps: [],
    };

    return analysis;
  }

  /**
   * 解析引用
   */
  private parseCitations(content: string): Citation[] {
    const citations: Citation[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*\[(.*?)\]\((.*?)\)\s*-\s*相关性:\s*(\d+)%$/);
      if (match) {
        citations.push({
          id: `citation-${citations.length + 1}`,
          source: '',
          title: match[1],
          url: match[2],
          relevanceScore: parseInt(match[3], 10),
          referencedAt: new Date().toISOString(),
        });
      }
    }

    return citations;
  }

  /**
   * 计算校验和
   */
  private computeChecksum(metadata: StateMetadata): string {
    const data = JSON.stringify(metadata);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// ============================================================
// 导出已在上方通过 `export class` 完成
// ============================================================
