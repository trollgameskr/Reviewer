import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { reviewService } from '../services/reviewService';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reviewStats'],
    queryFn: () => reviewService.getStats(),
  });

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <h1>대시보드</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="전체 리뷰"
              value={stats?.total || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="대기 중"
              value={stats?.pending || 0}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="답변 완료"
              value={stats?.answered || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="무시됨"
              value={stats?.ignored || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }} title="시스템 정보">
        <p>📱 구글 플레이 리뷰를 AI로 자동 분석하여 적절한 답변을 생성합니다.</p>
        <p>🤖 AI가 생성한 여러 답변 옵션 중 선택하거나 직접 작성할 수 있습니다.</p>
        <p>🌐 답변은 리뷰 작성자의 언어로 자동 번역됩니다.</p>
        <p>💡 지식베이스를 관리하여 AI 답변의 품질을 향상시킬 수 있습니다.</p>
      </Card>
    </div>
  );
};

export default Dashboard;
