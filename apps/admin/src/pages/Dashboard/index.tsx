import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic } from 'antd';

export default function Dashboard() {
  return (
    <PageContainer
      header={{
        title: '工作台',
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="今日订单" value={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="今日营业额" value={0} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="今日预约" value={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="新增客户" value={0} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <ProCard title="提示" headerBordered>
            数据看板占位页：T13 接入真实业务数据后展示营业额/预约/客户复购等指标。
          </ProCard>
        </Col>
      </Row>
    </PageContainer>
  );
}
