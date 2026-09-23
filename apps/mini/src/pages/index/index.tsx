import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { getShop, listServices } from '@/services/api';
import type { ServiceItem, Shop } from '@/services/api';

import './index.scss';

const DEFAULT_SHOP: Shop = {
  id: 1,
  name: '潮流理发店',
  address: '示例路 88 号',
  businessHours: '09:00 - 21:00',
  phone: '010-00000000',
};

export default function Index() {
  const [shop, setShop] = useState<Shop>(DEFAULT_SHOP);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    Taro.showLoading({ title: '加载中', mask: true });
    try {
      const [shopRes, svcRes] = await Promise.all([
        getShop(1).catch(() => null),
        listServices(1).catch(() => [] as ServiceItem[]),
      ]);
      if (shopRes) setShop(shopRes);
      setServices(Array.isArray(svcRes) ? svcRes : []);
    } catch (err) {
      Taro.showToast({ title: '加载失败', icon: 'none' });
      console.error('[index] load failed', err);
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const goBooking = (serviceId: number) => {
    Taro.navigateTo({ url: `/pages/booking/index?serviceId=${serviceId}` });
  };

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      {/* 店铺信息 */}
      <View className="bg-white px-5 py-6 shadow-sm">
        <Text className="block text-2xl font-bold text-gray-900">{shop.name}</Text>
        <View className="mt-3 flex items-start">
          <Text className="text-xs text-gray-500 w-12 shrink-0">地址</Text>
          <Text className="text-sm text-gray-700 flex-1">{shop.address}</Text>
        </View>
        <View className="mt-2 flex items-start">
          <Text className="text-xs text-gray-500 w-12 shrink-0">营业</Text>
          <Text className="text-sm text-gray-700 flex-1">{shop.businessHours}</Text>
        </View>
        {shop.phone ? (
          <View className="mt-2 flex items-start">
            <Text className="text-xs text-gray-500 w-12 shrink-0">电话</Text>
            <Text className="text-sm text-gray-700 flex-1">{shop.phone}</Text>
          </View>
        ) : null}
      </View>

      {/* 服务列表 */}
      <View className="px-4 py-4">
        <Text className="block text-base font-semibold text-gray-900 mb-3">服务项目</Text>
        {!loading && services.length === 0 ? (
          <View className="bg-white rounded-lg py-10 flex flex-col items-center">
            <Text className="text-sm text-gray-400">暂无服务项目</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {services.map((item) => (
              <View
                key={item.id}
                onClick={() => goBooking(item.id)}
                className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
              >
                <View className="flex justify-between items-start">
                  <View className="flex-1">
                    <Text className="block text-base font-medium text-gray-900">{item.name}</Text>
                    {item.description ? (
                      <Text className="block text-xs text-gray-500 mt-1 line-clamp-2">
                        {item.description}
                      </Text>
                    ) : null}
                    <Text className="block text-xs text-gray-400 mt-2">
                      时长 {item.duration} 分钟
                    </Text>
                  </View>
                  <View className="ml-3 shrink-0">
                    <Text className="text-lg font-bold text-red-500">¥{item.price}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
