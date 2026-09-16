import { type ReactNode } from 'react';

interface BlankLayoutProps {
  children: ReactNode;
}

/**
 * 空白布局：用于登录、错误页等无侧边栏场景
 */
export default function BlankLayout({ children }: BlankLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f2f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}
