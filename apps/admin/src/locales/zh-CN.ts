export default {
  app: {
    title: '理发店管理后台',
  },
  common: {
    confirm: '确定',
    cancel: '取消',
    save: '保存',
    back: '返回',
    loading: '加载中...',
    success: '操作成功',
    failed: '操作失败',
  },
  menu: {
    dashboard: '工作台',
  },
  login: {
    title: '登录',
    subTitle: '店主 / 员工登录',
    username: '用户名',
    password: '密码',
    submit: '登录',
    usernameRequired: '请输入用户名',
    passwordRequired: '请输入密码',
    success: '登录成功',
    failed: '登录失败',
  },
  dashboard: {
    title: '工作台',
    todayOrders: '今日订单',
    todayRevenue: '今日营业额',
    todayAppointments: '今日预约',
    newClients: '新增客户',
  },
  notFound: {
    title: '404',
    subTitle: '抱歉，您访问的页面不存在。',
    back: '返回工作台',
  },
} as const;
