import { View, Text } from '@tarojs/components';
import './index.scss';

export default function Index() {
  return (
    <View className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6">
      <View className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-4 shadow-md">
        <Text className="text-white text-xl font-bold">Hair</Text>
      </View>
      <Text className="text-lg text-gray-800 font-medium">欢迎</Text>
      <Text className="text-sm text-gray-500 mt-2">理发店客户小程序</Text>
    </View>
  );
}
