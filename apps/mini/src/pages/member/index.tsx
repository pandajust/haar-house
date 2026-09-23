import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { listCards, rechargeCard } from '@/services/api';
import type { MemberCard } from '@/services/api';
import { useUserStore } from '@/store/user';
import { ensureLogin } from '@/utils/auth';

import './index.scss';

const STATUS_TEXT: Record<MemberCard['status'], string> = {
  active: '正常',
  frozen: '已冻结',
  expired: '已过期',
};

export default function Member() {
  const client = useUserStore((s) => s.client);
  const clientId = client?.id || '';

  const [cards, setCards] = useState<MemberCard[]>([]);
  const [loading, setLoading] = useState(true);

  // 充值弹层状态
  const [recharging, setRecharging] = useState<MemberCard | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!clientId) {
      setCards([]);
      setLoading(false);
      return;
    }
    Taro.showLoading({ title: '加载中', mask: true });
    try {
      const res = await listCards(clientId).catch(() => [] as MemberCard[]);
      setCards(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('[member] load failed', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      Taro.hideLoading();
    }
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  useDidShow(() => {
    void load();
  });

  const openRecharge = (card: MemberCard) => {
    setRecharging(card);
    setAmount('');
  };

  const doRecharge = async () => {
    const num = Number(amount);
    if (!amount || Number.isNaN(num) || num <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (!recharging) return;

    const token = await ensureLogin();
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: '充值中', mask: true });
    try {
      await rechargeCard(recharging.id, num);
      Taro.showToast({ title: '充值成功', icon: 'success' });
      setRecharging(null);
      void load();
    } catch (err) {
      console.error('[member] recharge failed', err);
      Taro.showToast({ title: '充值失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
      Taro.hideLoading();
    }
  };

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      {!clientId ? (
        <View className="flex flex-col items-center justify-center py-24">
          <Text className="text-sm text-gray-400">请先登录后查看会员卡</Text>
        </View>
      ) : !loading && cards.length === 0 ? (
        <View className="flex flex-col items-center justify-center py-24">
          <Text className="text-sm text-gray-400">暂无会员卡</Text>
        </View>
      ) : (
        <View className="px-4 py-4 space-y-3">
          {cards.map((c) => (
            <View key={c.id} className="bg-white rounded-lg p-4 shadow-sm">
              <View className="flex justify-between items-center">
                <Text className="text-base font-medium text-gray-900">{c.name}</Text>
                <Text
                  className={`text-xs ${
                    c.status === 'active' ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {STATUS_TEXT[c.status] || c.status}
                </Text>
              </View>
              <View className="mt-3">
                {c.type === 'stored' ? (
                  <View>
                    <Text className="text-xs text-gray-500">储值卡余额</Text>
                    <Text className="block text-2xl font-bold text-red-500 mt-1">
                      ¥{c.balance ?? 0}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text className="text-xs text-gray-500">次卡剩余次数</Text>
                    <Text className="block text-2xl font-bold text-red-500 mt-1">
                      {c.remaining ?? 0}
                      {typeof c.total === 'number' ? ` / ${c.total}` : ''} 次
                    </Text>
                  </View>
                )}
              </View>
              {c.type === 'stored' && c.status === 'active' ? (
                <View className="mt-4">
                  <Button
                    className="w-full h-9 rounded-lg bg-black text-white text-sm"
                    onClick={() => openRecharge(c)}
                  >
                    充值
                  </Button>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* 充值弹层 */}
      {recharging ? (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50"
          onClick={() => setRecharging(null)}
        >
          <View className="w-full bg-white rounded-t-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <View className="flex justify-between items-center mb-4">
              <Text className="text-base font-semibold text-gray-900">
                充值 - {recharging.name}
              </Text>
              <Text className="text-sm text-gray-400" onClick={() => setRecharging(null)}>
                关闭
              </Text>
            </View>
            <Text className="block text-sm text-gray-600 mb-2">充值金额</Text>
            <Input
              className="w-full h-11 px-3 bg-gray-50 rounded text-base text-gray-900"
              type="digit"
              placeholder="请输入充值金额"
              value={amount}
              onInput={(e) => setAmount(e.detail.value)}
            />
            <View className="mt-5">
              <Button
                className={`w-full h-11 rounded-lg text-base font-medium ${
                  submitting ? 'bg-gray-300 text-white' : 'bg-black text-white'
                }`}
                disabled={submitting}
                onClick={doRecharge}
              >
                确认充值
              </Button>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
