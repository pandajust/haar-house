import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Col,
  Drawer,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
} from 'antd';
import { useEffect, useRef, useState } from 'react';

import {
  clientApi,
  orderApi,
  shopApi,
  staffApi,
  type Client,
  type Order,
  type OrderItem,
  type PayMethod,
  type ServiceItem,
  type Staff,
} from '@/services/api';

const payMethodLabels: Record<PayMethod, string> = {
  cash: '现金',
  wechat: '微信',
  card_balance: '会员卡(余额)',
  card_times: '会员卡(次卡)',
  mixed: '混合',
};

const orderStatusLabels: Record<string, { text: string; color: string }> = {
  paid: { text: '已支付', color: 'success' },
  refunded: { text: '已退款', color: 'default' },
  pending: { text: '待支付', color: 'warning' },
};

interface OrderFormValues {
  clientId?: string;
  staffId?: string;
  items: OrderItem[];
  payMethod: PayMethod;
  discount: number;
}

export default function Orders() {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm<OrderFormValues>();

  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  const watchedItems = Form.useWatch('items', form);
  const watchedDiscount = Form.useWatch('discount', form);

  const subtotal = (watchedItems ?? []).reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.price) || 0),
    0,
  );
  const discount = watchedDiscount ?? 100;
  const total = +(subtotal * (discount / 100)).toFixed(2);

  const loadOptions = async () => {
    try {
      const [cRes, sRes, shopsRes] = await Promise.all([
        clientApi.listClients({ pageSize: 200 }),
        staffApi.listStaff({ pageSize: 200 }),
        shopApi.listShops({ pageSize: 1 }),
      ]);
      const shops = shopsRes.items ?? shopsRes.data ?? shopsRes.list ?? [];
      const shopId = shops[0]?.id ?? '';
      const svcRes = shopId ? await shopApi.listServices(shopId, { pageSize: 200 }) : { items: [] };
      setClients(cRes.items ?? cRes.data ?? cRes.list ?? []);
      setStaffList(sRes.items ?? sRes.data ?? sRes.list ?? []);
      setServices(svcRes.items ?? svcRes.data ?? svcRes.list ?? []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载选项失败');
    }
  };

  useEffect(() => {
    if (drawerOpen) {
      void loadOptions();
      form.setFieldsValue({
        items: [{ quantity: 1, price: 0 }],
        payMethod: 'cash',
        discount: 100,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        amount: total,
      };
      await orderApi.createOrder(payload);
      message.success('订单已创建');
      setDrawerOpen(false);
      actionRef.current?.reload();
    } catch (err) {
      // antd Form validation errors throw; ignore here
      if (err instanceof Error && err.message) {
        // 非表单校验错误才提示
      }
    }
  };

  const columns: ProColumns<Order>[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 160 },
    {
      title: '客户',
      dataIndex: 'clientName',
      width: 120,
      render: (_, record) => record.clientName ?? record.clientId ?? '-',
    },
    {
      title: '理发师',
      dataIndex: 'staffName',
      width: 120,
      render: (_, record) => record.staffName ?? record.staffId ?? '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 110,
      render: (_, record) => `¥${record.amount?.toFixed(2) ?? '0.00'}`,
    },
    {
      title: '支付方式',
      dataIndex: 'payMethod',
      width: 130,
      render: (_, record) => payMethodLabels[record.payMethod] ?? record.payMethod,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const meta = orderStatusLabels[record.status];
        return meta ? <Tag color={meta.color}>{meta.text}</Tag> : record.status;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 170,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record) =>
        record.status === 'paid' ? (
          <a
            style={{ color: '#ff4d4f' }}
            onClick={() => {
              modal.confirm({
                title: '确认退款该订单？',
                onOk: async () => {
                  try {
                    await orderApi.refundOrder(record.id);
                    message.success('已退款');
                    actionRef.current?.reload();
                  } catch (err) {
                    message.error(err instanceof Error ? err.message : '退款失败');
                  }
                },
              });
            }}
          >
            退款
          </a>
        ) : (
          <span style={{ color: '#999' }}>--</span>
        ),
    },
  ];

  return (
    <PageContainer
      header={{ title: '收银开单' }}
      extra={[
        <Button key="add" type="primary" onClick={() => setDrawerOpen(true)}>
          新建订单
        </Button>,
      ]}
    >
      <ProTable<Order>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        request={async (params) => {
          try {
            const res = await orderApi.listOrders({
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

      <Drawer
        title="新建订单"
        open={drawerOpen}
        width={720}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleCreate}>
              提交
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="clientId"
                label="客户"
                rules={[{ required: true, message: '请选择客户' }]}
              >
                <Select
                  showSearch
                  placeholder="搜索并选择客户"
                  optionFilterProp="label"
                  options={clients.map((c) => ({
                    label: `${c.name} ${c.phone}`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="staffId"
                label="主理发师"
                rules={[{ required: true, message: '请选择理发师' }]}
              >
                <Select
                  placeholder="选择理发师"
                  options={staffList.map((s) => ({
                    label: s.name,
                    value: s.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, items: OrderItem[]) => {
                  if (!items || items.length === 0) {
                    return Promise.reject(new Error('至少添加一项服务'));
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={8} align="middle">
                    <Col span={7}>
                      <Form.Item
                        {...restField}
                        name={[name, 'serviceId']}
                        rules={[{ required: true, message: '选择服务' }]}
                      >
                        <Select
                          placeholder="服务"
                          options={services.map((s) => ({
                            label: `${s.name} ¥${s.price}`,
                            value: s.id,
                          }))}
                          onChange={(val) => {
                            const svc = services.find((s) => s.id === val);
                            if (svc) {
                              const cur = form.getFieldValue('items') as OrderItem[];
                              const next = [...cur];
                              next[name] = { ...next[name], price: svc.price };
                              form.setFieldValue('items', next);
                            }
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'staffId']}
                      >
                        <Select
                          placeholder="执行理发师"
                          options={staffList.map((s) => ({
                            label: s.name,
                            value: s.id,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: '数量' }]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} placeholder="数量" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'price']}
                        rules={[{ required: true, message: '单价' }]}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="单价" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button danger type="link" onClick={() => remove(name)}>
                        删除
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block onClick={() => add({ quantity: 1, price: 0 })}>
                  + 添加服务
                </Button>
              </>
            )}
          </Form.List>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Form.Item
                name="payMethod"
                label="支付方式"
                rules={[{ required: true, message: '请选择支付方式' }]}
              >
                <Select
                  options={(Object.keys(payMethodLabels) as PayMethod[]).map((k) => ({
                    label: payMethodLabels[k],
                    value: k,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discount" label="折扣(%)" initialValue={100}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" style={{ marginTop: 8 }}>
            <Col>
              <Space size="large">
                <Statistic title="小计" value={subtotal} precision={2} prefix="¥" />
                <Statistic title="应收" value={total} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} />
              </Space>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </PageContainer>
  );
}