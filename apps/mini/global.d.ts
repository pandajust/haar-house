/// <reference types="@tarojs/taro" />

declare namespace NodeJS {
  interface ProcessEnv {
    /** 注入环境：development | production */
    NODE_ENV: 'development' | 'production'
    /** Taro 构建类型 */
    TARO_ENV: 'weapp' | 'h5' | 'rn' | 'alipay' | 'tt' | 'swan' | 'jd'
  }
}
