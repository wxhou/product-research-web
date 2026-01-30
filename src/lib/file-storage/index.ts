/**
 * File Storage Service
 *
 * 管理研究项目文件的存储和读取
 *
 * 目录结构：
 * task-data/
 * └── project-{projectId}/
 *     ├── index.json              # 项目索引
 *     ├── manifest.json           # 文件清单
 *     ├── raw/                    # 原始爬取内容
 *     │   ├── 001.md
 *     │   ├── 002.md
 *     │   └── ...
 *     ├── analysis/               # 分析中间结果
 *     │   ├── features.md
 *     │   ├── competitors.md
 *     │   ├── swot.md
 *     │   └── summary.md
 *     └── report.md              # 最终报告
 */

import fs from 'fs';
import path from 'path';

// ============================================================
// 类型定义
// ============================================================

/**
 * 项目索引文件结构
 */
export interface ProjectIndex {
  projectId: string;
  title: string;
  description?: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'extracting' | 'analyzing' | 'reporting' | 'completed';
  files: {
    raw: RawFileInfo[];
    analysis: AnalysisFileInfo[];
    report?: string;
  };
}

/**
 * 原始文件信息
 */
export interface RawFileInfo {
  id: string;           // 001, 002, ...
  url: string;
  title: string;
  source: string;
  filePath: string;
  size: number;
  crawledAt: string;
}

/**
 * 分析文件信息
 */
export interface AnalysisFileInfo {
  id: string;           // features, competitors, swot, summary
  type: 'features' | 'competitors' | 'swot' | 'summary';
  title: string;
  filePath: string;
  size: number;
  generatedAt: string;
}

/**
 * 文件清单结构
 */
export interface FileManifest {
  version: string;
  status: 'extracting' | 'analyzing' | 'reporting' | 'completed';
  raw: {
    [key: string]: {
      status: 'pending' | 'completed' | 'failed';
      size?: number;
      error?: string;
    };
  };
  analysis: {
    [key: string]: {
      status: 'pending' | 'completed' | 'failed';
      size?: number;
    };
  };
}

/**
 * 文件存储服务配置
 */
export interface FileStorageConfig {
  baseDir: string;
}

/**
 * 保存结果
 */
export interface SaveResult {
  success: boolean;
  filePath?: string;
  fileId?: string;
  error?: string;
}

/**
 * 读取结果
 */
export interface ReadResult {
  success: boolean;
  content?: string;
  error?: string;
}

// ============================================================
// 文件存储服务
// ============================================================

/**
 * 文件存储服务
 *
 * 提供研究项目文件的创建、读写、管理功能
 */
export class FileStorageService {
  private config: FileStorageConfig;

  constructor(config?: Partial<FileStorageConfig>) {
    this.config = {
      baseDir: config?.baseDir || 'task-data',
    };
  }

  /**
   * 创建项目目录结构
   */
  createProjectDir(projectId: string): string {
    const projectPath = path.join(this.config.baseDir, `project-${projectId}`);
    const subdirs = ['raw', 'analysis'];

    for (const subdir of subdirs) {
      const dirPath = path.join(projectPath, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    return projectPath;
  }

  /**
   * 初始化项目索引
   */
  initProjectIndex(
    projectPath: string,
    projectId: string,
    title: string,
    description?: string,
    keywords: string[] = []
  ): ProjectIndex {
    const now = new Date().toISOString();

    const index: ProjectIndex = {
      projectId,
      title,
      description,
      keywords,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      files: {
        raw: [],
        analysis: [],
      },
    };

    this.saveProjectIndex(projectPath, index);
    this.initManifest(projectPath);

    return index;
  }

  /**
   * 保存项目索引
   */
  saveProjectIndex(projectPath: string, index: ProjectIndex): void {
    const indexPath = path.join(projectPath, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 读取项目索引
   */
  readProjectIndex(projectPath: string): ProjectIndex | null {
    const indexPath = path.join(projectPath, 'index.json');

    if (!fs.existsSync(indexPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf-8');
      return JSON.parse(content) as ProjectIndex;
    } catch {
      return null;
    }
  }

  /**
   * 初始化文件清单
   */
  private initManifest(projectPath: string): void {
    const manifest: FileManifest = {
      version: '1.0',
      status: 'extracting',
      raw: {},
      analysis: {},
    };

    this.saveManifest(projectPath, manifest);
  }

  /**
   * 保存文件清单
   */
  private saveManifest(projectPath: string, manifest: FileManifest): void {
    const manifestPath = path.join(projectPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * 读取文件清单
   */
  readManifest(projectPath: string): FileManifest | null {
    const manifestPath = path.join(projectPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content) as FileManifest;
    } catch {
      return null;
    }
  }

  /**
   * 保存原始文件
   */
  saveRawFile(
    projectPath: string,
    index: number,
    content: string,
    metadata: {
      url: string;
      title: string;
      source: string;
    }
  ): SaveResult {
    try {
      const rawDir = path.join(projectPath, 'raw');
      const fileId = String(index).padStart(3, '0');
      const fileName = `${fileId}.md`;
      const filePath = path.join(rawDir, fileName);

      // 保存文件
      fs.writeFileSync(filePath, content, 'utf-8');

      const fileInfo: RawFileInfo = {
        id: fileId,
        url: metadata.url,
        title: metadata.title,
        source: metadata.source,
        filePath,
        size: content.length,
        crawledAt: new Date().toISOString(),
      };

      // 更新索引
      const projectIndex = this.readProjectIndex(projectPath);
      if (projectIndex) {
        projectIndex.files.raw.push(fileInfo);
        projectIndex.updatedAt = new Date().toISOString();
        this.saveProjectIndex(projectPath, projectIndex);
      }

      // 更新清单
      const manifest = this.readManifest(projectPath);
      if (manifest) {
        manifest.raw[fileId] = {
          status: 'completed',
          size: content.length,
        };
        this.saveManifest(projectPath, manifest);
      }

      return {
        success: true,
        filePath,
        fileId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存原始文件失败',
      };
    }
  }

  /**
   * 保存分析文件
   */
  saveAnalysisFile(
    projectPath: string,
    type: 'features' | 'competitors' | 'swot' | 'summary',
    content: string,
    title?: string
  ): SaveResult {
    try {
      const analysisDir = path.join(projectPath, 'analysis');
      const fileName = `${type}.md`;
      const filePath = path.join(analysisDir, fileName);

      // 保存文件
      fs.writeFileSync(filePath, content, 'utf-8');

      const fileInfo: AnalysisFileInfo = {
        id: type,
        type,
        title: title || `${type} 分析结果`,
        filePath,
        size: content.length,
        generatedAt: new Date().toISOString(),
      };

      // 更新索引
      const projectIndex = this.readProjectIndex(projectPath);
      if (projectIndex) {
        // 移除已存在的同类型文件
        projectIndex.files.analysis = projectIndex.files.analysis.filter(f => f.type !== type);
        projectIndex.files.analysis.push(fileInfo);
        projectIndex.updatedAt = new Date().toISOString();
        this.saveProjectIndex(projectPath, projectIndex);
      }

      // 更新清单
      const manifest = this.readManifest(projectPath);
      if (manifest) {
        manifest.analysis[type] = {
          status: 'completed',
          size: content.length,
        };
        this.saveManifest(projectPath, manifest);
      }

      return {
        success: true,
        filePath,
        fileId: type,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存分析文件失败',
      };
    }
  }

  /**
   * 保存报告
   */
  saveReport(projectPath: string, content: string): SaveResult {
    try {
      const reportPath = path.join(projectPath, 'report.md');

      // 保存文件
      fs.writeFileSync(reportPath, content, 'utf-8');

      // 更新索引
      const projectIndex = this.readProjectIndex(projectPath);
      if (projectIndex) {
        projectIndex.files.report = reportPath;
        projectIndex.status = 'completed';
        projectIndex.updatedAt = new Date().toISOString();
        this.saveProjectIndex(projectPath, projectIndex);
      }

      // 更新清单
      const manifest = this.readManifest(projectPath);
      if (manifest) {
        manifest.status = 'completed';
        this.saveManifest(projectPath, manifest);
      }

      return {
        success: true,
        filePath: reportPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存报告失败',
      };
    }
  }

  /**
   * 读取单个文件
   */
  readFile(filePath: string): ReadResult {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: '文件不存在',
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return {
        success: true,
        content,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取文件失败',
      };
    }
  }

  /**
   * 读取所有原始文件
   */
  readAllRawFiles(projectPath: string): Array<{ id: string; content: string; info: RawFileInfo }> {
    const rawDir = path.join(projectPath, 'raw');
    const projectIndex = this.readProjectIndex(projectPath);

    if (!projectIndex || !fs.existsSync(rawDir)) {
      return [];
    }

    const results: Array<{ id: string; content: string; info: RawFileInfo }> = [];

    for (const fileInfo of projectIndex.files.raw) {
      const readResult = this.readFile(fileInfo.filePath);
      if (readResult.success && readResult.content) {
        results.push({
          id: fileInfo.id,
          content: readResult.content,
          info: fileInfo,
        });
      }
    }

    return results;
  }

  /**
   * 读取所有分析文件
   */
  readAllAnalysisFiles(projectPath: string): Array<{ type: string; content: string; info: AnalysisFileInfo }> {
    const projectIndex = this.readProjectIndex(projectPath);

    if (!projectIndex) {
      return [];
    }

    const results: Array<{ type: string; content: string; info: AnalysisFileInfo }> = [];

    for (const fileInfo of projectIndex.files.analysis) {
      const readResult = this.readFile(fileInfo.filePath);
      if (readResult.success && readResult.content) {
        results.push({
          type: fileInfo.type,
          content: readResult.content,
          info: fileInfo,
        });
      }
    }

    return results;
  }

  /**
   * 更新清单状态
   */
  updateManifestStatus(
    projectPath: string,
    category: 'raw' | 'analysis',
    fileId: string,
    status: 'pending' | 'completed' | 'failed',
    error?: string
  ): void {
    const manifest = this.readManifest(projectPath);
    if (!manifest) return;

    if (category === 'raw') {
      manifest.raw[fileId] = { status, error };
    } else {
      manifest.analysis[fileId] = { status };
    }

    this.saveManifest(projectPath, manifest);
  }

  /**
   * 更新项目状态
   */
  updateProjectStatus(
    projectPath: string,
    status: ProjectIndex['status']
  ): void {
    const projectIndex = this.readProjectIndex(projectPath);
    if (!projectIndex) return;

    projectIndex.status = status;
    projectIndex.updatedAt = new Date().toISOString();
    this.saveProjectIndex(projectPath, projectIndex);
  }

  /**
   * 检查项目是否存在
   */
  projectExists(projectId: string): boolean {
    const projectPath = path.join(this.config.baseDir, `project-${projectId}`);
    const indexPath = path.join(projectPath, 'index.json');
    return fs.existsSync(indexPath);
  }

  /**
   * 获取项目路径
   */
  getProjectPath(projectId: string): string {
    return path.join(this.config.baseDir, `project-${projectId}`);
  }

  /**
   * 生成主文件（索引所有内容的 Markdown 文件）
   */
  generateMasterFile(projectPath: string): string {
    const projectIndex = this.readProjectIndex(projectPath);
    if (!projectIndex) {
      return '';
    }

    let content = `# ${projectIndex.title}\n\n`;
    content += `> 项目ID: ${projectIndex.projectId}\n`;
    content += `> 创建时间: ${projectIndex.createdAt}\n`;
    content += `> 关键词: ${projectIndex.keywords.join(', ')}\n\n`;

    content += `---\n\n`;

    // 原始文件列表
    content += `## 原始数据文件\n\n`;
    content += `| ID | 标题 | 来源 | 大小 |\n`;
    content += `|----|------|------|------|\n`;
    for (const file of projectIndex.files.raw) {
      content += `| ${file.id} | ${file.title} | ${file.source} | ${(file.size / 1024).toFixed(1)} KB |\n`;
    }

    content += `\n---\n\n`;

    // 分析文件列表
    content += `## 分析结果文件\n\n`;
    content += `| 类型 | 标题 | 生成时间 |\n`;
    content += `|------|------|----------|\n`;
    for (const file of projectIndex.files.analysis) {
      content += `| ${file.type} | ${file.title} | ${file.generatedAt.split('T')[0]} |\n`;
    }

    content += `\n---\n\n`;

    // 报告链接
    if (projectIndex.files.report) {
      content += `## 最终报告\n\n`;
      content += `报告文件: ${projectIndex.files.report}\n`;
    }

    return content;
  }
}

// ============================================================
// 单例导出
// ============================================================

let fileStorageService: FileStorageService | null = null;

export function getFileStorageService(): FileStorageService {
  if (!fileStorageService) {
    fileStorageService = new FileStorageService();
  }
  return fileStorageService;
}

export function createFileStorageService(config?: Partial<FileStorageConfig>): FileStorageService {
  fileStorageService = new FileStorageService(config);
  return fileStorageService;
}
