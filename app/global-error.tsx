'use client';

/**
 * Global error boundary for catching errors in the root layout
 * This is a fallback for errors that occur before the regular error boundary
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error boundary caught:', error);
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
            {/* Error Icon */}
            <div
              style={{
                marginBottom: '2rem',
                fontSize: '4rem',
              }}
            >
              ⚠️
            </div>

            {/* Error Code */}
            <h1
              style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                color: '#dc2626',
              }}
            >
              500
            </h1>

            {/* Title */}
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              应用程序错误
            </h2>

            {/* Description */}
            <p
              style={{
                marginBottom: '2rem',
                color: '#6b7280',
              }}
            >
              抱歉，应用程序遇到了一个严重错误。
              <br />
              请刷新页面重试。
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: '#dc2626',
                  }}
                >
                  开发模式错误信息：
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                  }}
                >
                  {error.message}
                </p>
                {error.digest && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      marginTop: '0.5rem',
                      color: '#6b7280',
                    }}
                  >
                    错误ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                🔄 重试
              </button>
              <a
                href="/"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                🏠 返回首页
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
