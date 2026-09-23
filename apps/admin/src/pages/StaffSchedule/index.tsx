import {
  PageContainer,
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Col,
  Drawer,
  Empty,
  Form,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useRef, useState } from 'react';

import {
  staffApi,
  type Schedule,
  type Staff,
  type StaffRole,
} from '@/services/api';

const roleLabels: Record<StaffRole, string> = {
  owner: '店主',
  manager: '店长',
  barber: '理发师',
  staff: '员工',
};

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface ScheduleFormValues {
  weekday: number;
  startTime: Dayjs;
  endTime: Dayjs;
}

export default function StaffSchedule() {
  const { message, modal } = App.useApp();
  const staffActionRef = useRef<ActionType>(null);
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm] = Form.useForm<ScheduleFormValues>();

  const loadSchedules = async (staffId: string) => {
    setScheduleLoading(true);
    try {
      const list = await staffApi.listSchedules(staffId);
      setSchedules(list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载排班失败');
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStaff) {
      void loadSchedules(selectedStaff.id);
    } else {
      setSchedules([]);
    }
  }, [selectedStaff]);

  const staffColumns: ProColumns<Staff>[] = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '手机号', dataIndex: 'phone', width: 130 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 90,
      render: (_, record) => roleLabels[record.role] ?? record.role,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, record) =>
        record.status === 'inactive' ? (
          <Tag color="default">停用</Tag>
        ) : (
          <Tag color="success">在职</Tag>
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, record) => [
        <a
          key="schedule"
          onClick={() => setSelectedStaff(record)}
        >
          排班
        </a>,
        <a
          key="edit"
          onClick={() => {
            setEditingStaff(record);
            setStaffDrawerOpen(true);
          }}
        >
          编辑
        </a>,
        <a
          key="del"
          style={{ color: '#ff4d4f' }}
          onClick={() => {
            modal.confirm({
              title: '确认删除该员工？',
              onOk: async () => {
                await staffApi.deleteStaff(record.id);
                message.success('已删除');
                if (selectedStaff?.id === record.id) setSelectedStaff(null);
                staffActionRef.current?.reload();
              },
            });
          }}
        >
          删除
        </a>,
      ],
    },
  ];

  const handleStaffSubmit = async (values: Partial<Staff>) => {
    try {
      if (editingStaff) {
        await staffApi.updateStaff(editingStaff.id, values);
        message.success('已更新');
      } else {
        await staffApi.createStaff(values);
        message.success('已创建');
      }
      setStaffDrawerOpen(false);
      setEditingStaff(null);
      staffActionRef.current?.reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  const openScheduleModal = (sch?: Schedule) => {
    setEditingSchedule(sch ?? null);
    scheduleForm.setFieldsValue({
      weekday: sch?.weekday ?? 1,
      startTime: sch?.startTime ? dayjs(sch.startTime, 'HH:mm') : dayjs('09:00', 'HH:mm'),
      endTime: sch?.endTime ? dayjs(sch.endTime, 'HH:mm') : dayjs('18:00', 'HH:mm'),
    });
    setScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedStaff) return;
    try {
      const values = await scheduleForm.validateFields();
      const payload = {
        weekday: values.weekday,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
      };
      if (editingSchedule) {
        await staffApi.updateSchedule(selectedStaff.id, editingSchedule.id, payload);
        message.success('排班已更新');
      } else {
        await staffApi.createSchedule(selectedStaff.id, payload);
        message.success('排班已添加');
      }
      setScheduleModalOpen(false);
      await loadSchedules(selectedStaff.id);
    } catch (err) {
      // form validation throws; ignore
    }
  };

  const scheduleColumns = [
    {
      title: '星期',
      dataIndex: 'weekday',
      width: 100,
      render: (v: number) => weekdayLabels[v] ?? v,
    },
    { title: '开始时间', dataIndex: 'startTime', width: 120 },
    { title: '结束时间', dataIndex: 'endTime', width: 120 },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: Schedule) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openScheduleModal(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={async () => {
              if (!selectedStaff) return;
              await staffApi.deleteSchedule(selectedStaff.id, record.id);
              message.success('已删除');
              await loadSchedules(selectedStaff.id);
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{ title: '员工与排班' }}
      extra={[
        <Button
          key="add"
          type="primary"
          onClick={() => {
            setEditingStaff(null);
            setStaffDrawerOpen(true);
          }}
        >
          新建员工
        </Button>,
      ]}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <ProTable<Staff>
            rowKey="id"
            actionRef={staffActionRef}
            columns={staffColumns}
            search={false}
            request={async (params) => {
              try {
                const res = await staffApi.listStaff({
                  page: params.current,
                  pageSize: params.pageSize,
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
        </Col>
        <Col xs={24} lg={10}>
          <div
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 16,
              minHeight: 400,
            }}
          >
            {selectedStaff ? (
              <>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Typography.Text strong>
                    {selectedStaff.name} 的排班
                  </Typography.Text>
                  <Button type="primary" onClick={() => openScheduleModal()}>
                    添加排班
                  </Button>
                </Space>
                <Table<Schedule>
                  rowKey="id"
                  size="small"
                  style={{ marginTop: 12 }}
                  loading={scheduleLoading}
                  dataSource={schedules}
                  columns={scheduleColumns}
                  pagination={false}
                  locale={{ emptyText: '暂无排班' }}
                />
              </>
            ) : (
              <Empty description="点击左侧员工的「排班」查看/编辑排班" />
            )}
          </div>
        </Col>
      </Row>

      <Drawer
        title={editingStaff ? '编辑员工' : '新建员工'}
        open={staffDrawerOpen}
        width={480}
        onClose={() => {
          setStaffDrawerOpen(false);
          setEditingStaff(null);
        }}
        destroyOnClose
      >
        <ProForm<Partial<Staff>>
          layout="vertical"
          initialValues={editingStaff ?? { role: 'barber' as StaffRole }}
          onFinish={handleStaffSubmit}
          submitter={{
            searchConfig: { submitText: '保存', resetText: '取消' },
            resetButtonProps: { onClick: () => setStaffDrawerOpen(false) },
          }}
        >
          <ProFormText
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          />
          <ProFormText name="phone" label="手机号" />
          <ProFormText
            name="username"
            label="登录账号"
            rules={[{ required: !editingStaff, message: '请输入账号' }]}
          />
          <ProFormText.Password
            name="password"
            label="登录密码"
            rules={[
              { required: !editingStaff, message: '新建员工时请输入密码' },
            ]}
          />
          <ProFormSelect
            name="role"
            label="角色"
            options={(Object.keys(roleLabels) as StaffRole[]).map((k) => ({
              label: roleLabels[k],
              value: k,
            }))}
            rules={[{ required: true, message: '请选择角色' }]}
          />
          <ProFormDigit
            name="commissionRate"
            label="提成比例(%)"
            min={0}
            max={100}
            fieldProps={{ precision: 1 }}
          />
        </ProForm>
      </Drawer>

      <Modal
        title={editingSchedule ? '编辑排班' : '添加排班'}
        open={scheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => setScheduleModalOpen(false)}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={scheduleForm} layout="vertical" preserve={false}>
          <Form.Item
            name="weekday"
            label="星期"
            rules={[{ required: true, message: '请选择星期' }]}
          >
            <Select
              options={weekdayLabels.map((label, value) => ({ label, value }))}
            />
          </Form.Item>
          <Form.Item
            name="startTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="endTime"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}