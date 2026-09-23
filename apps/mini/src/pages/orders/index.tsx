import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { listOrders } from '@/services/api';
import type { Order } from '@/services/api';

import './index.scss';

const STATUS_TEXT: Record<Order['status'], string> = {
  unpaid: '待支付',
  paid: '已支付',
  refunded: '已退款',
};

const PAY_METHOD_TEXT: Record<Order['payMethod'], string> = {
  cash: '现金',
  wechat: '微信',
  card: '会员卡',
};

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);

  const load = async () => {
    Taro.showLoading({ title: '加载中', mask: true });
    try {
      const res = await listOrders().catch(() => [] as Order[]);
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('[orders] load failed', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useDidShow(() => {
    void load();
  });

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      {!loading && orders.length === 0 ? (
        <View className="flex flex-col items-center justify-center py-24">
          <Text className="text-sm text-gray-400">暂无订单</Text>
        </View>
      ) : (
        <View className="px-4 py-4 space-y-3">
          {orders.map((o) => (
            <View
              key={o.id}
              onClick={() => setDetail(o)}
              className="bg-white rounded-lg p-4 shadow-sm active:bg-gray-50"
            >
              <View className="flex justify-between items-center">
                <Text className="text-base font-medium text-gray-900">{o.serviceName}</Text>
                <Text
                  className={`text-sm ${
                    o.status === 'paid'
                      ? 'text-green-600'
                      : o.status === 'refunded'
                        ? 'text-gray-400'
                        : 'text-orange-500'
                  }`}
                >
                  {STATUS_TEXT[o.status] || o.status}
                </Text>
              </View>
              <View className="mt-2 flex items-center justify-between">
                <Text className="text-xs text-gray-500">理发师：{o.staffName}</Text>
                <Text className="text-xs text-gray-500">{formatTime(o.createdAt)}</Text>
              </View>
              <View className="mt-2 flex items-center justify-between">
                <Text className="text-xs text-gray-500">
                  支付方式：{PAY_METHOD_TEXT[o.payMethod] || o.payMethod}
                </Text>
                <Text className="text-lg font-bold text-red-500">¥{o.amount}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 订单详情弹层 */}
      {detail ? (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50"
          onClick={() => setDetail(null)}
        >
          <View className="w-full bg-white rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <View className="flex justify-between items-center mb-4">
              <Text className="text-base font-semibold text-gray-900">订单详情</Text>
              <Text className="text-sm text-gray-400" onClick={() => setDetail(null)}>
                关闭
              </Text>
            </View>
            <View className="space-y-2 text-sm">
              <View className="flex justify-between">
                <Text className="text-gray-500">订单号</Text>
                <Text className="text-gray-900">{detail.id}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">服务</Text>
                <Text className="text-gray-900">{detail.serviceName}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">理发师</Text>
                <Text className="text-gray-900">{detail.staffName}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">金额</Text>
                <Text className="text-red-500 font-medium">¥{detail.amount}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">支付方式</Text>
                <Text className="text-gray-900">
                  {PAY_METHOD_TEXT[detail.payMethod] || detail.payMethod}
                </Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">状态</Text>
                <Text className="text-gray-900">{STATUS_TEXT[detail.status] || detail.status}</Text>
              </View>
              <View className="flex justify-between">
                <Text className="text-gray-500">下单时间</Text>
                <Text className="text-gray-900">{formatTime(detail.createdAt)}</Text>
              </View>
              {detail.remark ? (
                <View className="flex justify-between">
                  <Text className="text-gray-500">备注</Text>
                  <Text className="text-gray-900">{detail.remark}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
