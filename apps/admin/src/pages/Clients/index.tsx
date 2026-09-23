import {
  PageContainer,
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Drawer, Space, Tag } from 'antd';
import { useRef, useState } from 'react';

import {
  clientApi,
  type Client,
  type Gender,
} from '@/services/api';

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '未知', value: 'unknown' },
];

const tagPresets = ['新客', '老客', 'VIP', '敏感', '学生'];

export default function Clients() {
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const columns: ProColumns<Client>[] = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 80,
      valueType: 'select',
      valueEnum: {
        male: { text: '男' },
        female: { text: '女' },
        unknown: { text: '未知' },
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (_, record) =>
        (record.tags ?? []).map((t) => (
          <Tag key={t} color="blue">
            {t}
          </Tag>
        )),
    },
    {
      title: '最后到店',
      dataIndex: 'lastVisitAt',
      width: 160,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, record) => [
        <a
          key="edit"
          onClick={() => {
            setEditing(record);
            setDrawerOpen(true);
          }}
        >
          编辑
        </a>,
        <a
          key="del"
          style={{ color: '#ff4d4f' }}
          onClick={() => {
            modal.confirm({
              title: '确认删除该客户？',
              onOk: async () => {
                await clientApi.deleteClient(record.id);
                message.success('已删除');
                actionRef.current?.reload();
              },
            });
          }}
        >
          删除
        </a>,
      ],
    },
  ];

  const handleSubmit = async (values: Partial<Client>) => {
    try {
      if (editing) {
        await clientApi.updateClient(editing.id, values);
        message.success('已更新');
      } else {
        await clientApi.createClient(values);
        message.success('已创建');
      }
      setDrawerOpen(false);
      setEditing(null);
      actionRef.current?.reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <PageContainer
      header={{ title: '客户管理' }}
      extra={[
        <Button
          key="add"
          type="primary"
          onClick={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
        >
          新建客户
        </Button>,
      ]}
    >
      <ProTable<Client>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          try {
            const res = await clientApi.listClients({
              page: params.current,
              pageSize: params.pageSize,
              keyword: (params.keyword as string) || undefined,
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
        toolBarRender={() => [
          <span key="tip" style={{ color: '#999' }}>
            提示：可在上方搜索框按姓名/手机号检索
          </span>,
        ]}
      />

      <Drawer
        title={editing ? '编辑客户' : '新建客户'}
        open={drawerOpen}
        width={480}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        destroyOnClose
      >
        <ProForm<Partial<Client>>
          layout="vertical"
          initialValues={
            editing ?? { gender: 'unknown' as Gender, tags: [] }
          }
          onFinish={handleSubmit}
          submitter={{
            searchConfig: { submitText: '保存', resetText: '取消' },
            resetButtonProps: {
              onClick: () => setDrawerOpen(false),
            },
          }}
        >
          <ProFormText
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          />
          <ProFormText
            name="phone"
            label="手机号"
            rules={[{ required: true, message: '请输入手机号' }]}
          />
          <ProFormSelect
            name="gender"
            label="性别"
            options={genderOptions}
          />
          <ProFormSelect
            name="tags"
            label="标签"
            mode="multiple"
            options={tagPresets.map((t) => ({ label: t, value: t }))}
            placeholder="可选择或输入自定义标签"
          />
          <ProFormTextArea name="note" label="备注" />
        </ProForm>
        <Space />
      </Drawer>
    </PageContainer>
  );
}