/**
 * JSON 解析工具
 *
 * 提供稳定的 JSON 解析能力。
 *
 * 设计原则：
 * 1) LLM 输出已经是合法 JSON 时，不做破坏性改写，直接解析
 * 2) 仅处理外层包装（如 ```json 代码块、前后解释文字）
 * 3) 解析失败时返回 defaultValue，由上层决定重试或降级
 */

/**
 * 从代码块中提取 JSON 文本。
 */
function extractFencedJson(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : null;
}

/**
 * 提取第一个平衡的大括号/中括号 JSON 块。
 * 支持字符串中的转义字符，避免在字符串内部错误计数。
 */
function extractBalancedJson(text: string): string | null {
  const start = text.search(/[\[{]/);
  if (start < 0) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      const expectedOpen = ch === '}' ? '{' : '[';
      const lastOpen = stack.pop();
      if (lastOpen !== expectedOpen) {
        return null;
      }

      if (stack.length === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

/**
 * 获取候选 JSON 文本。
 */
function getJsonCandidate(responseText: string): string | null {
  const trimmed = responseText.trim();

  // 优先解析代码块中的内容
  const fenced = extractFencedJson(trimmed);
  if (fenced) {
    return fenced;
  }

  // 若整个文本已是 JSON，直接使用
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return trimmed;
  }

  // 最后从混合文本中提取第一个平衡 JSON 块
  return extractBalancedJson(trimmed);
}

/**
 * 仅清理常见的 Markdown 装饰噪声，不做结构性修复。
 * 该步骤仅在第一次 JSON.parse 失败后使用。
 */
function cleanupMarkdownArtifacts(candidate: string): string {
  return candidate
    // 去除 BOM/零宽字符，避免隐藏字符导致解析失败
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    // 修复类似 **"issues"**: [] 的 key 装饰
    .replace(/\*\*\s*"([^"]+)"\s*\*\*(\s*:)/g, '"$1"$2')
    // 修复类似 __"issues"__: [] 的 key 装饰
    .replace(/__\s*"([^"]+)"\s*__(\s*:)/g, '"$1"$2');
}

/**
 * 仅在字符串字面量内部转义未转义控制字符，避免破坏 JSON 结构字符。
 */
function escapeControlCharsInStringLiterals(input: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = !inString;
      continue;
    }

    if (inString) {
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }

      const code = ch.charCodeAt(0);
      if (code >= 0 && code < 0x20) {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
        continue;
      }
    }

    out += ch;
  }

  return out;
}

/**
 * 从 LLM 响应中提取并解析 JSON
 *
 * @param responseText LLM 返回的原始文本
 * @param defaultValue 解析失败时返回的默认值
 * @returns 解析后的 JSON 对象
 */
export function parseJsonFromLLM<T = unknown>(
  responseText: string,
  defaultValue?: T
): T {
  let candidate: string | null = null;

  try {
    candidate = getJsonCandidate(responseText);
    if (!candidate) {
      console.warn('[JSON Parse] No JSON found in response');
      return defaultValue as T;
    }

    return JSON.parse(candidate) as T;
  } catch (error) {
    // 仅在严格解析失败后，尝试最小化修复：Markdown 装饰 + 字符串内控制字符转义
    if (candidate) {
      try {
        const markdownCleaned = cleanupMarkdownArtifacts(candidate);
        const controlEscaped = escapeControlCharsInStringLiterals(markdownCleaned);

        if (controlEscaped !== candidate) {
          console.warn('[JSON Parse] Strict parse failed; recovered after minimal fallback cleanup');
          return JSON.parse(controlEscaped) as T;
        }
      } catch {
        // 忽略 fallback 失败，继续走统一错误日志
      }
    }

    console.error('[JSON Parse] Failed to parse JSON:', error);
    return defaultValue as T;
  }
}

/**
 * 尝试解析 JSON，返回是否成功
 *
 * @param text 要解析的文本
 * @returns [成功: boolean, 结果: T | null]
 */
export function tryParseJson<T = unknown>(text: string): [boolean, T | null] {
  const result = parseJsonFromLLM<T | null>(text, null);
  if (result === null) {
    return [false, null];
  }
  return [true, result];
}

/**
 * 带重试的 JSON 解析
 *
 * 如果第一次解析失败，会提示 LLM 重新返回正确格式的 JSON
 *
 * @param generateTextFn 生成文本的函数（异步）
 * @param prompt 提示词
 * @param maxRetries 最大重试次数
 * @returns 解析后的 JSON 对象
 */
export async function parseJsonWithRetry<T = unknown>(
  generateTextFn: (prompt: string, maxTokens?: number) => Promise<string>,
  prompt: string,
  maxRetries: number = 3,
  maxTokens?: number  // 不设置默认值，传递给 generateText 后使用其配置中的默认值
): Promise<T> {
  const errorPromptSuffix = '\n\n注意：你的上次回答无法被解析为有效 JSON。请确保：\n1. 只输出纯 JSON（不要使用 ```json 代码块，不要附加解释）\n2. 使用标准 JSON 语法\n3. 字符串中不要包含未转义换行符\n4. 数组和对象不要有多余逗号';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const responseText = await generateTextFn(prompt, maxTokens);
      const result = parseJsonFromLLM<T | undefined>(responseText, undefined);

      if (result !== undefined && result !== null) {
        return result;
      }

      console.warn(`[JSON Parse] 第 ${attempt + 1} 次解析失败，重试中...`);
      prompt += errorPromptSuffix;
    } catch (error) {
      console.warn(`[JSON Parse] 第 ${attempt + 1} 次解析异常:`, error);
      prompt += errorPromptSuffix;
    }
  }

  throw new Error(`JSON 解析失败，已重试 ${maxRetries} 次`);
}
