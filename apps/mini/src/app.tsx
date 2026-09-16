import type { PropsWithChildren } from 'react';
import { Component } from 'react';

import { ensureLogin } from './utils/auth';
import './app.scss';

class App extends Component<PropsWithChildren> {
  componentDidMount() {
    // 进入小程序时尝试静默登录（不阻塞首屏渲染）
    void ensureLogin().catch((err) => {
      console.warn('[app] ensureLogin failed:', err);
    });
  }

  componentDidShow() {}

  componentDidHide() {}

  // TabBar 路由表：首页 / 我的（profile）
  render() {
    return this.props.children;
  }
}

export default App;
