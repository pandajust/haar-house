import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { useUserStore } from '@/store/user';

import './index.scss';

interface MenuItem {
  key: string;
  label: string;
  url?: string;
}

const MENUS: MenuItem[] = [
  { key: 'orders', label: '我的订单', url: '/pages/orders/index' },
  { key: 'member', label: '我的会员卡', url: '/pages/member/index' },
  { key: 'contact', label: '联系客服' },
];

export default function Profile() {
  const client = useUserStore((s) => s.client);
  const clear = useUserStore((s) => s.clear);

  const handleMenu = (item: MenuItem) => {
    if (item.key === 'contact') {
      Taro.showToast({ title: '客服电话：010-00000000', icon: 'none' });
      return;
    }
    if (item.url) {
      Taro.navigateTo({ url: item.url });
    }
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          clear();
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  };

  return (
    <View className="min-h-screen bg-gray-50">
      {/* 用户信息 */}
      <View className="bg-white px-5 py-8 flex items-center">
        <View className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {client?.avatar ? (
            <Image src={client.avatar} className="w-16 h-16" mode="aspectFill" />
          ) : (
            <Text className="text-2xl text-gray-400">
              {client?.name ? client.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>
        <View className="ml-4">
          <Text className="block text-lg font-semibold text-gray-900">
            {client?.name || '未登录'}
          </Text>
          <Text className="block text-xs text-gray-500 mt-1">
            {client ? '已登录' : '点击登录后享受更多服务'}
          </Text>
        </View>
      </View>

      {/* 菜单 */}
      <View className="mt-2 bg-white">
        {MENUS.map((item, idx) => (
          <View
            key={item.key}
            onClick={() => handleMenu(item)}
            className={`flex items-center justify-between px-5 h-12 active:bg-gray-50 ${
              idx < MENUS.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <Text className="text-sm text-gray-800">{item.label}</Text>
            <Text className="text-gray-300">›</Text>
          </View>
        ))}
      </View>

      {/* 退出登录 */}
      {client ? (
        <View className="px-5 mt-6">
          <View
            onClick={handleLogout}
            className="bg-white h-12 rounded-lg flex items-center justify-center active:bg-gray-50"
          >
            <Text className="text-sm text-red-500">退出登录</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
