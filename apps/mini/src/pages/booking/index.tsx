import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { createAppointment, getSlots, listServices, listStaff } from '@/services/api';
import type { ServiceItem, Staff, TimeSlot } from '@/services/api';
import { ensureLogin } from '@/utils/auth';

import './index.scss';

const DEFAULT_STAFF: Staff[] = [
  { id: 1, name: 'Tony 老师', title: '高级发型师', shopId: 1 },
  { id: 2, name: 'Kevin 老师', title: '资深发型师', shopId: 1 },
  { id: 3, name: 'Andy 老师', title: '发型师', shopId: 1 },
];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDateOptions() {
  const today = new Date();
  const opts: { label: string; value: string }[] = [];
  const labels = ['今天', '明天', '后天'];
  for (let i = 0; i < 3; i += 1) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    opts.push({ label: labels[i], value: formatDate(d) });
  }
  return opts;
}

export default function Booking() {
  const router = useRouter();
  const serviceIdParam = router.params?.serviceId;
  const serviceId = serviceIdParam ? Number(serviceIdParam) : 0;

  const [service, setService] = useState<ServiceItem | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>(DEFAULT_STAFF);
  const [staffId, setStaffId] = useState<number>(0);
  const [dateOptions] = useState(buildDateOptions);
  const [date, setDate] = useState<string>(dateOptions[0].value);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [time, setTime] = useState<string>('');
  const [remark, setRemark] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const loadService = async () => {
    if (!serviceId) return;
    try {
      const list = await listServices(1).catch(() => [] as ServiceItem[]);
      const found = list.find((s) => s.id === serviceId);
      if (found) setService(found);
    } catch (err) {
      console.error('[booking] load service failed', err);
    }
  };

  const loadStaff = async () => {
    try {
      const list = await listStaff().catch(() => [] as Staff[]);
      if (Array.isArray(list) && list.length > 0) {
        setStaffList(list);
        setStaffId(list[0].id);
      } else {
        setStaffId(DEFAULT_STAFF[0].id);
      }
    } catch (err) {
      console.error('[booking] load staff failed', err);
      setStaffId(DEFAULT_STAFF[0].id);
    }
  };

  const loadSlots = async (sid: number, d: string) => {
    if (!sid) return;
    Taro.showLoading({ title: '加载时段', mask: true });
    try {
      const res = await getSlots(sid, d).catch(() => [] as TimeSlot[]);
      const list = Array.isArray(res) ? res : [];
      setSlots(list);
      setTime('');
    } catch (err) {
      console.error('[booking] load slots failed', err);
      setSlots([]);
    } finally {
      Taro.hideLoading();
    }
  };

  useEffect(() => {
    void loadService();
    void loadStaff();
  }, [serviceId]);

  useEffect(() => {
    if (staffId) {
      void loadSlots(staffId, date);
    }
  }, [staffId, date]);

  const availableSlots = useMemo(() => slots.filter((s) => s.available), [slots]);

  const submit = async () => {
    if (!serviceId) {
      Taro.showToast({ title: '服务信息缺失', icon: 'none' });
      return;
    }
    if (!staffId) {
      Taro.showToast({ title: '请选择理发师', icon: 'none' });
      return;
    }
    if (!time) {
      Taro.showToast({ title: '请选择时间段', icon: 'none' });
      return;
    }

    const token = await ensureLogin();
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    setSubmitting(true);
    Taro.showLoading({ title: '提交中', mask: true });
    try {
      await createAppointment({
        serviceId,
        staffId,
        date,
        time,
        remark,
      });
      Taro.showToast({ title: '预约成功', icon: 'success' });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/orders/index' });
      }, 800);
    } catch (err) {
      console.error('[booking] submit failed', err);
      Taro.showToast({ title: '预约失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
      Taro.hideLoading();
    }
  };

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      {/* 服务信息 */}
      <View className="bg-white px-5 py-4">
        <Text className="block text-base font-semibold text-gray-900">
          {service ? service.name : '服务项目'}
        </Text>
        <View className="mt-2 flex items-center justify-between">
          <Text className="text-sm text-gray-500">
            {service ? `时长 ${service.duration} 分钟` : ''}
          </Text>
          <Text className="text-lg font-bold text-red-500">
            {service ? `¥${service.price}` : ''}
          </Text>
        </View>
      </View>

      {/* 理发师 */}
      <View className="bg-white mt-2 px-5 py-4">
        <Text className="block text-sm font-medium text-gray-900 mb-3">选择理发师</Text>
        <View className="flex flex-wrap gap-2">
          {staffList.map((s) => (
            <View
              key={s.id}
              onClick={() => setStaffId(s.id)}
              className={`px-4 py-2 rounded-full border text-sm ${
                staffId === s.id
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <Text>{s.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 日期 */}
      <View className="bg-white mt-2 px-5 py-4">
        <Text className="block text-sm font-medium text-gray-900 mb-3">选择日期</Text>
        <View className="flex flex-wrap gap-2">
          {dateOptions.map((d) => (
            <View
              key={d.value}
              onClick={() => setDate(d.value)}
              className={`px-4 py-2 rounded-lg border text-sm ${
                date === d.value
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <Text>{d.label}</Text>
              <Text className="ml-1 opacity-70">{d.value.slice(5)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 时段 */}
      <View className="bg-white mt-2 px-5 py-4">
        <Text className="block text-sm font-medium text-gray-900 mb-3">选择时间段</Text>
        {availableSlots.length === 0 ? (
          <Text className="text-sm text-gray-400">当日暂无可用时段</Text>
        ) : (
          <View className="flex flex-wrap gap-2">
            {availableSlots.map((s) => (
              <View
                key={s.time}
                onClick={() => setTime(s.time)}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  time === s.time
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                <Text>{s.time}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 备注 */}
      <View className="bg-white mt-2 px-5 py-4">
        <Text className="block text-sm font-medium text-gray-900 mb-2">备注</Text>
        <Input
          className="w-full h-10 px-3 bg-gray-50 rounded text-sm text-gray-800"
          placeholder="选填，请输入备注"
          value={remark}
          onInput={(e) => setRemark(e.detail.value)}
        />
      </View>

      {/* 提交 */}
      <View className="px-5 py-6">
        <Button
          className={`w-full h-11 rounded-lg text-base font-medium ${
            submitting ? 'bg-gray-300 text-white' : 'bg-black text-white'
          }`}
          disabled={submitting}
          onClick={submit}
        >
          提交预约
        </Button>
      </View>
    </ScrollView>
  );
}
