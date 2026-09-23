import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Badge, Button, Select, Space } from 'antd';
import { useRef, useState } from 'react';

import {
  appointmentApi,
  type Appointment,
  type AppointmentStatus,
} from '@/services/api';

const STATUS_META: Record<
  AppointmentStatus,
  { text: string; color: string }
> = {
  pending: { text: '待确认', color: 'default' },
  confirmed: { text: '已确认', color: 'blue' },
  in_service: { text: '服务中', color: 'processing' },
  done: { text: '已完成', color: 'success' },
  canceled: { text: '已取消', color: 'default' },
  no_show: { text: '未到店', color: 'warning' },
};

const statusOptions: { label: string; value: AppointmentStatus }[] = [
  { label: '待确认', value: 'pending' },
  { label: '已确认', value: 'confirmed' },
  { label: '服务中', value: 'in_service' },
  { label: '已完成', value: 'done' },
  { label: '已取消', value: 'canceled' },
  { label: '未到店', value: 'no_show' },
];

/** 根据当前状态返回可执行的操作 */
function nextActions(status: AppointmentStatus): {
  label: string;
  value: AppointmentStatus;
  danger?: boolean;
}[] {
  switch (status) {
    case 'pending':
      return [
        { label: '确认', value: 'confirmed' },
        { label: '取消', value: 'canceled', danger: true },
      ];
    case 'confirmed':
      return [
        { label: '开始服务', value: 'in_service' },
        { label: '取消', value: 'canceled', danger: true },
      ];
    case 'in_service':
      return [{ label: '完成', value: 'done' }];
    default:
      return [];
  }
}

export default function Appointments() {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>(
    undefined,
  );

  const columns: ProColumns<Appointment>[] = [
    {
      title: '客户',
      dataIndex: 'clientName',
      width: 120,
      render: (_, record) => record.clientName ?? record.clientId,
    },
    {
      title: '理发师',
      dataIndex: 'staffName',
      width: 120,
      render: (_, record) => record.staffName ?? record.staffId,
    },
    {
      title: '服务',
      dataIndex: 'serviceName',
      width: 140,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 170,
      valueType: 'dateTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (_, record) => {
        const meta = STATUS_META[record.status];
        return <Badge status={meta.color as never} text={meta.text} />;
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      render: (_, record) => {
        const actions = nextActions(record.status);
        if (actions.length === 0) return <span style={{ color: '#999' }}>--</span>;
        return (
          <Space size="small">
            {actions.map((a) => (
              <Button
                key={a.value}
                type="link"
                size="small"
                danger={a.danger}
                onClick={async () => {
                  try {
                    await appointmentApi.updateStatus(record.id, a.value);
                    message.success(`已${a.label}`);
                    actionRef.current?.reload();
                  } catch (err) {
                    message.error(err instanceof Error ? err.message : '操作失败');
                  }
                }}
              >
                {a.label}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{ title: '预约管理' }}
      extra={[
        <Select
          key="status"
          allowClear
          placeholder="状态筛选"
          style={{ width: 160 }}
          value={statusFilter}
          options={statusOptions}
          onChange={(v) => {
            setStatusFilter(v);
            actionRef.current?.reload();
          }}
        />,
      ]}
    >
      <ProTable<Appointment>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async (params) => {
          try {
            const res = await appointmentApi.listAppointments({
              page: params.current,
              pageSize: params.pageSize,
              status: statusFilter,
            });
            const list = res.items ?? res.data ?? res.list ?? [];
            return {
              data: list,
              success: true,
              total: res.total ?? list.length,
            };
          } catch (err) {
            message.error(err instanceof Error ? err.message : '加载失败');
            return { data: [], success: false, total: 0 };
          }
        }}
      />
    </PageContainer>
  );
}