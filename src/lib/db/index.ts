import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'research.db');

// 确保data目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
function initDatabase() {
  db.exec(`
    -- 项目表
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      keywords TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 搜索结果表
    CREATE TABLE IF NOT EXISTS search_results (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source TEXT NOT NULL,
      query TEXT NOT NULL,
      url TEXT,
      title TEXT,
      content TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- 报告表
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      mermaid_charts TEXT,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    -- 数据源配置表
    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 用户设置表
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY UNIQUE,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_search_results_project ON search_results(project_id);
    CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
  `);

  // 插入默认数据源
  const defaultSources = [
    // RSS 订阅（免费，无需配置）
    { id: 'rss-hackernews', name: 'Hacker News', type: 'rss-hackernews', config: '{}' },
    { id: 'rss-techcrunch', name: 'TechCrunch', type: 'rss-techcrunch', config: '{}' },
    { id: 'rss-theverge', name: 'The Verge', type: 'rss-theverge', config: '{}' },
    { id: 'rss-wired', name: 'Wired', type: 'rss-wired', config: '{}' },
    { id: 'rss-producthunt', name: 'Product Hunt', type: 'rss-producthunt', config: '{}' },
    // 免费搜索
    { id: 'duckduckgo', name: 'DuckDuckGo', type: 'duckduckgo', config: '{}' },
    { id: 'bing', name: 'Bing Search', type: 'bing', config: '{}' },
    // 需要 API Key（可选）
    { id: 'newsapi', name: 'NewsAPI', type: 'newsapi', config: '{}' },
    { id: 'gnews', name: 'GNews', type: 'gnews', config: '{}' },
    // GitHub（免费）
    { id: 'github', name: 'GitHub', type: 'github', config: '{}' },
  ];

  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO data_sources (id, name, type, config) VALUES (@id, @name, @type, @config)
  `);

  for (const source of defaultSources) {
    insertSource.run(source);
  }
}

// 立即初始化数据库
initDatabase();

// 项目相关操作
export const projectDb = {
  create: db.prepare(`
    INSERT INTO projects (id, title, description, keywords, status)
    VALUES (@id, @title, @description, @keywords, @status)
  `),

  getById: db.prepare(`
    SELECT * FROM projects WHERE id = @id
  `),

  getAll: db.prepare(`
    SELECT * FROM projects ORDER BY created_at DESC
  `),

  getByStatus: db.prepare(`
    SELECT * FROM projects WHERE status = @status ORDER BY created_at DESC
  `),

  update: db.prepare(`
    UPDATE projects SET
      title = @title,
      description = @description,
      keywords = @keywords,
      status = @status,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  delete: db.prepare(`DELETE FROM projects WHERE id = @id`),
};

// 搜索结果相关操作
export const searchResultDb = {
  create: db.prepare(`
    INSERT INTO search_results (id, project_id, source, query, url, title, content, raw_data)
    VALUES (@id, @project_id, @source, @query, @url, @title, @content, @raw_data)
  `),

  getByProject: db.prepare(`
    SELECT * FROM search_results WHERE project_id = @project_id ORDER BY created_at DESC
  `),

  deleteByProject: db.prepare(`DELETE FROM search_results WHERE project_id = @project_id`),
};

// 报告相关操作
export const reportDb = {
  create: db.prepare(`
    INSERT INTO reports (id, project_id, title, content, mermaid_charts)
    VALUES (@id, @project_id, @title, @content, @mermaid_charts)
  `),

  getByProject: db.prepare(`
    SELECT * FROM reports WHERE project_id = @project_id
  `),

  getById: db.prepare(`
    SELECT * FROM reports WHERE id = @id
  `),

  update: db.prepare(`
    UPDATE reports SET
      title = @title,
      content = @content,
      mermaid_charts = @mermaid_charts,
      version = version + 1
    WHERE id = @id
  `),
};

// 数据源相关操作
export const dataSourceDb = {
  getAll: db.prepare(`
    SELECT * FROM data_sources ORDER BY created_at DESC
  `),

  getActive: db.prepare(`
    SELECT * FROM data_sources WHERE is_active = 1
  `),

  getById: db.prepare(`
    SELECT * FROM data_sources WHERE id = @id
  `),

  update: db.prepare(`
    UPDATE data_sources SET
      name = @name,
      config = @config,
      is_active = @is_active
    WHERE id = @id
  `),
};

// 用户设置操作
export const settingsDb = {
  get: db.prepare(`SELECT value FROM user_settings WHERE key = @key`),
  set: db.prepare(`
    INSERT INTO user_settings (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = CURRENT_TIMESTAMP
  `),
};

export { initDatabase };
export default db;
