import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dbPath = path.join(process.cwd(), 'data', 'research.db');

// 确保data目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 简单密码 hash 函数
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 初始化数据库表
function initDatabase() {
  // 检查是否需要迁移（projects 表是否存在）
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").get() as { name: string } | undefined;
  const needMigration = tableInfo !== undefined;

  if (!needMigration) {
    // 新数据库 - 完整创建所有表
    db.exec(`
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 项目表
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        keywords TEXT,
        status TEXT DEFAULT 'draft',
        progress INTEGER DEFAULT 0,
        progress_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- 搜索结果表
      CREATE TABLE IF NOT EXISTS search_results (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT DEFAULT 'default',
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
        user_id TEXT DEFAULT 'default',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        mermaid_charts TEXT,
        version INTEGER DEFAULT 1,
        used_llm INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- 调研任务表（后台任务队列）
      CREATE TABLE IF NOT EXISTS research_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
      CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
      CREATE INDEX IF NOT EXISTS idx_search_results_project ON search_results(project_id);
      CREATE INDEX IF NOT EXISTS idx_search_results_source ON search_results(source);
      CREATE INDEX IF NOT EXISTS idx_reports_project ON reports(project_id);
      CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(is_active);
      CREATE INDEX IF NOT EXISTS idx_research_tasks_status ON research_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_research_tasks_user ON research_tasks(user_id);
    `);
  } else {
    // 迁移现有数据库
    // 检查是否已有 users 表
    const hasUsers = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();

    if (!hasUsers) {
      // 添加 users 表
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 为现有表添加 user_id 列
      db.exec(`
        ALTER TABLE projects ADD COLUMN user_id TEXT DEFAULT 'default';
        ALTER TABLE search_results ADD COLUMN user_id TEXT DEFAULT 'default';
        ALTER TABLE reports ADD COLUMN user_id TEXT DEFAULT 'default';
      `);

      // 创建索引
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
      `);
    }

    // 检查各表是否缺少 user_id 列，并逐个添加
    const checkColumn = (table: string) => {
      try {
        db.prepare(`SELECT user_id FROM ${table} LIMIT 1`).get();
        return true;
      } catch {
        return false;
      }
    };

    if (!checkColumn('projects')) {
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN user_id TEXT DEFAULT 'default'`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id)`);
      } catch (e) {
        // 忽略错误（列可能已存在）
      }
    }
    if (!checkColumn('search_results')) {
      try {
        db.exec(`ALTER TABLE search_results ADD COLUMN user_id TEXT DEFAULT 'default'`);
      } catch (e) {
        // 忽略错误
      }
    }
    if (!checkColumn('reports')) {
      try {
        db.exec(`ALTER TABLE reports ADD COLUMN user_id TEXT DEFAULT 'default'`);
      } catch (e) {
        // 忽略错误
      }
    }

    // 迁移：添加 progress 和 progress_message 列到 projects 表
    const checkProjectColumn = (column: string) => {
      try {
        db.prepare(`SELECT ${column} FROM projects LIMIT 1`).get();
        return true;
      } catch {
        return false;
      }
    };

    if (!checkProjectColumn('progress')) {
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT 0`);
      } catch (e) {
        // 忽略错误
      }
    }

    if (!checkProjectColumn('progress_message')) {
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN progress_message TEXT`);
      } catch (e) {
        // 忽略错误
      }
    }

    // 创建 research_tasks 表（如果不存在）
    const hasResearchTasks = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='research_tasks'").get();
    if (!hasResearchTasks) {
      try {
        db.exec(`
          -- 调研任务表（后台任务队列）
          CREATE TABLE IF NOT EXISTS research_tasks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            priority INTEGER DEFAULT 0,
            error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            completed_at DATETIME,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE INDEX IF NOT EXISTS idx_research_tasks_status ON research_tasks(status);
          CREATE INDEX IF NOT EXISTS idx_research_tasks_user ON research_tasks(user_id);
        `);
      } catch (e) {
        console.error('Failed to create research_tasks table:', e);
      }
    }

    // 检查是否需要创建 default 用户
    const defaultUser = db.prepare("SELECT id FROM users WHERE username = 'default'").get();
    if (!defaultUser) {
      db.prepare(`
        INSERT INTO users (id, username, role)
        VALUES ('default', 'default', 'user')
      `).run({ id: 'default', username: 'default', role: 'user' });
    }
  }

  // 创建 xadmin 超级管理员（如果不存在）
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'xadmin' AND role = 'admin'").get();
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (id, username, password_hash, role)
      VALUES ('xadmin', 'xadmin', ?, 'admin')
    `).run(hashPassword('research2026'));
  }

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

  // 迁移：为现有表添加 used_llm 字段
  try {
    db.prepare("ALTER TABLE reports ADD COLUMN used_llm INTEGER DEFAULT 0").run();
  } catch (e) {
    // 字段已存在，忽略错误
  }
}

// 立即初始化数据库
initDatabase();

// 用户相关操作
export const userDb = {
  create: db.prepare(`
    INSERT INTO users (id, username, password_hash, role)
    VALUES (@id, @username, @password_hash, @role)
  `),

  getById: db.prepare(`
    SELECT id, username, role, created_at FROM users WHERE id = @id
  `),

  getByUsername: db.prepare(`
    SELECT id, username, password_hash, role, created_at FROM users WHERE username = @username
  `),

  getAll: db.prepare(`
    SELECT id, username, role, created_at FROM users ORDER BY created_at DESC
  `),

  delete: db.prepare(`DELETE FROM users WHERE id = @id`),

  exists: db.prepare(`
    SELECT 1 FROM users WHERE username = @username
  `),

  verifyPassword: db.prepare(`
    SELECT id, username, role FROM users
    WHERE username = @username AND password_hash = @password_hash
  `),
};

// 项目相关操作
export const projectDb = {
  create: db.prepare(`
    INSERT INTO projects (id, user_id, title, description, keywords, status, progress, progress_message)
    VALUES (@id, @user_id, @title, @description, @keywords, @status, @progress, @progress_message)
  `),

  getById: db.prepare(`
    SELECT * FROM projects WHERE id = @id
  `),

  getAll: db.prepare(`
    SELECT * FROM projects ORDER BY created_at DESC
  `),

  getByUser: db.prepare(`
    SELECT * FROM projects WHERE user_id = @user_id ORDER BY created_at DESC
  `),

  getByUserAndStatus: db.prepare(`
    SELECT * FROM projects WHERE user_id = @user_id AND status = @status ORDER BY created_at DESC
  `),

  getByStatus: db.prepare(`
    SELECT * FROM projects WHERE status = @status ORDER BY created_at DESC
  `),

  // 更新项目状态和进度
  update: db.prepare(`
    UPDATE projects SET
      title = @title,
      description = @description,
      keywords = @keywords,
      status = @status,
      progress = @progress,
      progress_message = @progress_message,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  // 仅更新进度
  updateProgress: db.prepare(`
    UPDATE projects SET
      progress = @progress,
      progress_message = @progress_message,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  // 仅更新状态
  updateStatus: db.prepare(`
    UPDATE projects SET
      status = @status,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  delete: db.prepare(`DELETE FROM projects WHERE id = @id`),
};

// 调研任务相关操作
export const taskDb = {
  create: db.prepare(`
    INSERT INTO research_tasks (id, project_id, user_id, status)
    VALUES (@id, @project_id, @user_id, @status)
  `),

  getById: db.prepare(`
    SELECT * FROM research_tasks WHERE id = @id
  `),

  getByProject: db.prepare(`
    SELECT * FROM research_tasks WHERE project_id = @project_id
  `),

  // 获取等待中的任务（按优先级排序）
  getPending: db.prepare(`
    SELECT * FROM research_tasks
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
  `),

  // 获取用户进行中的任务数量
  getProcessingCount: db.prepare(`
    SELECT COUNT(*) as count FROM research_tasks
    WHERE user_id = @user_id AND status = 'processing'
  `).get as (params: { user_id: string }) => { count: number },

  // 获取用户等待中的任务数量
  getPendingCount: db.prepare(`
    SELECT COUNT(*) as count FROM research_tasks
    WHERE user_id = @user_id AND status = 'pending'
  `).get as (params: { user_id: string }) => { count: number },

  // 更新任务状态
  updateStatus: db.prepare(`
    UPDATE research_tasks SET
      status = @status,
      started_at = CASE WHEN @status = 'processing' THEN CURRENT_TIMESTAMP ELSE started_at END,
      completed_at = CASE WHEN @status IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
      error = @error
    WHERE id = @id
  `),

  // 更新任务为进行中
  markProcessing: db.prepare(`
    UPDATE research_tasks SET
      status = 'processing',
      started_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  // 更新任务为完成
  markCompleted: db.prepare(`
    UPDATE research_tasks SET
      status = 'completed',
      completed_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  // 更新任务为失败
  markFailed: db.prepare(`
    UPDATE research_tasks SET
      status = 'failed',
      completed_at = CURRENT_TIMESTAMP,
      error = @error
    WHERE id = @id
  `),

  deleteByProject: db.prepare(`DELETE FROM research_tasks WHERE project_id = @project_id`),
};

// 搜索结果相关操作
export const searchResultDb = {
  create: db.prepare(`
    INSERT INTO search_results (id, project_id, user_id, source, query, url, title, content, raw_data)
    VALUES (@id, @project_id, @user_id, @source, @query, @url, @title, @content, @raw_data)
  `),

  getByProject: db.prepare(`
    SELECT * FROM search_results WHERE project_id = @project_id ORDER BY created_at DESC
  `),

  deleteByProject: db.prepare(`DELETE FROM search_results WHERE project_id = @project_id`),
};

// 报告相关操作
export const reportDb = {
  create: db.prepare(`
    INSERT INTO reports (id, project_id, user_id, title, content, mermaid_charts, used_llm)
    VALUES (@id, @project_id, @user_id, @title, @content, @mermaid_charts, @used_llm)
  `),

  deleteByProject: db.prepare(`DELETE FROM reports WHERE project_id = @project_id`),

  getAll: db.prepare(`
    SELECT * FROM reports ORDER BY created_at DESC
  `),

  getByUser: db.prepare(`
    SELECT * FROM reports WHERE user_id = @user_id ORDER BY created_at DESC
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

export { initDatabase, hashPassword };
export default db;
