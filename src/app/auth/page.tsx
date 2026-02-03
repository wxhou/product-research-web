'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, register, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  // 已登录用户直接跳转到首页
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // 自动检测是否需要密码
  useEffect(() => {
    if (username.toLowerCase() === 'xadmin') {
      setShowPassword(true);
    } else {
      setShowPassword(false);
      setPassword('');
    }
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // xadmin 必须输入密码才能登录
      if (showPassword) {
        if (!password) {
          setError('请输入密码');
          setLoading(false);
          return;
        }
        const success = await login(username, password);
        if (!success) {
          setError('用户名或密码错误');
        } else {
          router.push('/');
        }
      } else {
        // 普通用户直接注册/登录
        const success = await register(username);
        if (!success) {
          setError('操作失败，请重试');
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果正在加载，显示加载状态
  if (isAuthenticated) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-bg-shape shape-1"></div>
          <div className="auth-bg-shape shape-2"></div>
          <div className="auth-bg-shape shape-3"></div>
        </div>
        <div className="auth-droplets"></div>
        <div className="auth-glass-texture"></div>
        <div className="auth-loading">
          <div className="auth-loading-spinner"></div>
          <p>正在跳转...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* 背景装饰 - 街角咖啡厅氛围 */}
      <div className="auth-bg">
        <div className="auth-bg-shape shape-1"></div>
        <div className="auth-bg-shape shape-2"></div>
        <div className="auth-bg-shape shape-3"></div>
      </div>

      {/* 水珠效果 - 玻璃上的凝结水珠 */}
      <div className="auth-droplets"></div>

      {/* 玻璃纹理 */}
      <div className="auth-glass-texture"></div>

      <div className="auth-card">
        <div className="auth-card-inner">
          {/* 标题 */}
          <div className="auth-card-title">
            <h1>欢迎回来</h1>
            <p>输入用户名开始使用产品调研助手</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">{error}</div>
            )}

            <div className={`auth-input-wrapper ${focused ? 'focused' : ''}`}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                required
                minLength={2}
                maxLength={50}
                autoComplete="username"
                className="auth-input"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </div>

            {showPassword && (
              <div className="auth-input-wrapper fade-in">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  autoComplete="current-password"
                  className="auth-input"
                />
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="auth-btn-loading"></span>
              ) : (
                '进入'
              )}
            </button>
          </form>

          {showPassword && (
            <div className="auth-hint fade-in">
              普通用户直接输入用户名进入
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
