/**
 * JSON 解析工具
 *
 * 提供健壮的 JSON 解析功能，处理 LLM 返回的特殊字符问题
 */

/**
 * 清理字符串中的控制字符
 *
 * 移除 JSON 中不允许的控制字符（如 \x00-\x1F，但保留 \n, \t, \r）
 */
function sanitizeControlCharacters(str: string): string {
  // 移除不允许的控制字符（0x00-0x1F，但保留 \n, \t, \r）
  // 同时移除 \x0B (垂直制表符) 和其他非法字符
  return str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, (char) => {
    // 保留换行符和制表符
    if (char === '\n' || char === '\t' || char === '\r') {
      return char;
    }
    // 替换其他控制字符为空字符串
    return '';
  });
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
  try {
    // 1. 提取 JSON 块（匹配 {...} 或 [...]）
    const jsonMatch = responseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

    if (!jsonMatch) {
      console.warn('[JSON Parse] No JSON found in response');
      return defaultValue as T;
    }

    // 2. 清理控制字符
    let sanitized = sanitizeControlCharacters(jsonMatch[0]);
    // 修复 LLM 常见的语法错误：双冒号 :: 改为单冒号 :
    sanitized = sanitized.replace(/::/g, ':');

    // 3. 解析 JSON
    return JSON.parse(sanitized) as T;
  } catch (error) {
    // 4. 如果还是失败，尝试更激进的清理
    try {
      // 移除所有非 ASCII 字符（保留基本标点）
      const cleaned = responseText
        .replace(/\{[\s\S]*\}/, (match) => {
          // 只保留 ASCII 可打印字符和基本标点
          return match.replace(/[^\x20-\x7E\n\t\r{},:\[\]".]/g, '');
        });

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
    } catch {
      // 忽略清理失败
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
  try {
    const result = parseJsonFromLLM<T>(text);
    return [true, result];
  } catch {
    return [false, null];
  }
}
