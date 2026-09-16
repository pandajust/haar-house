import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Alert, App } from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useUserStore } from '@/store/user';

interface LoginValues {
  username: string;
  password: string;
}

interface LocationState {
  from?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const login = useUserStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (values: LoginValues): Promise<boolean> => {
    const { username, password } = values;
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      message.success('登录成功');
      const from = (location.state as LocationState | null)?.from;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 360 }}>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <LoginForm<LoginValues>
        title="理发店管理后台"
        subTitle="店主 / 员工登录"
        onFinish={handleSubmit}
        submitter={{
          searchConfig: { submitText: '登录' },
          submitButtonProps: { loading },
        }}
      >
        <ProFormText
          name="username"
          fieldProps={{
            size: 'large',
            prefix: <UserOutlined />,
          }}
          placeholder="请输入用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        />
        <ProFormText.Password
          name="password"
          fieldProps={{
            size: 'large',
            prefix: <LockOutlined />,
          }}
          placeholder="请输入密码"
          rules={[{ required: true, message: '请输入密码' }]}
        />
        <div style={{ marginBottom: 8 }}>
          <Alert
            type="info"
            message="开发期 mock：账号 admin / 密码 admin 直接登录"
            showIcon
            banner
          />
        </div>
      </LoginForm>
    </div>
  );
}
