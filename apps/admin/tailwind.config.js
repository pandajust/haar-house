/** @type {import('tailwindcss').Config} */
export default {
  // 与 antd 5 共存策略：
  // 1. prefix='tw-' 命名空间所有 tailwind utility，避免与 antd 的 .ant-* 类名冲突
  // 2. 关闭 preflight，避免 tailwind 的 element reset 覆盖 antd 组件默认样式
  // 使用：className="tw-flex tw-p-4"
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
