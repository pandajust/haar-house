import { View, Text } from '@tarojs/components';

import { useUserStore } from '@/store/user';
import './index.scss';

export default function Profile() {
  const client = useUserStore((s) => s.client);

  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
      <Text className="text-lg text-gray-800 font-medium">我的</Text>
      {client ? (
        <Text className="text-sm text-gray-600 mt-2">{client.name}</Text>
      ) : (
        <Text className="text-sm text-gray-500 mt-2">未登录</Text>
      )}
    </View>
  );
}
