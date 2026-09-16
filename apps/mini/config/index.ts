import path from 'path'
import { defineConfig } from '@tarojs/cli'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'
import devConfig from './dev'
import prodConfig from './prod'

const SRC_ROOT = path.resolve(__dirname, '..', 'src')

export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'mini',
    date: '2026-9-16',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      848: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: {
      patterns: [],
      options: {}
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false
    },
    alias: {
      '@': SRC_ROOT
    },
    mini: {
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        // Taro 把 pluginOption.config 直接作为参数传给 tailwindcss() PostCSS 插件，
        // 因此这里传 Tailwind v3 的完整配置对象（不再用 tailwindConfig 嵌套字段）。
        tailwindcss: {
          enable: true,
          config: {
            content: [
              './src/**/*.{js,ts,jsx,tsx,html}',
              './src/**/*'
            ],
            theme: {
              extend: {}
            },
            plugins: [],
            corePlugins: {
              preflight: false
            }
          }
        }
      },
      // chain 来自 webpack-chain，TS 类型解析较复杂，这里用显式 any 保持 strict 模式可用
      webpackChain(chain: any) {
        chain.resolve.alias.set('@', SRC_ROOT)
        chain
          .plugin('weapp-tailwindcss')
          .use(UnifiedWebpackPluginV5, [{ appType: 'taro' }])
      }
    },
    h5: {
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        tailwindcss: {
          enable: true,
          config: {
            content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
            theme: { extend: {} },
            plugins: []
          }
        }
      }
    },
    rn: {
      compiler: 'hermes',
      postcss: {}
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
