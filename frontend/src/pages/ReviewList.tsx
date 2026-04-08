import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Rate, Button, Select, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { reviewService, Review } from '../services/reviewService';

const { Option } = Select;

const ReviewList: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reviews', status, page, pageSize],
    queryFn: () => reviewService.getReviews({ status, page, limit: pageSize }),
  });

  const columns = [
    {
      title: '사용자',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
    },
    {
      title: '평점',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      render: (rating: number) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: '리뷰 내용',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text: string) => (
        <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {text}
        </div>
      ),
    },
    {
      title: '언어',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      render: (lang: string) => <Tag>{lang.toUpperCase()}</Tag>,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          PENDING: 'orange',
          ANSWERED: 'green',
          IGNORED: 'red',
        };
        const labels: Record<string, string> = {
          PENDING: '대기',
          ANSWERED: '완료',
          IGNORED: '무시',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    {
      title: '등록일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      render: (_: any, record: Review) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reviews/${record.id}`)}
        >
          상세
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>리뷰 관리</h1>
        <Space>
          <Select
            style={{ width: 120 }}
            placeholder="상태 선택"
            allowClear
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <Option value="PENDING">대기</Option>
            <Option value="ANSWERED">완료</Option>
            <Option value="IGNORED">무시</Option>
          </Select>
          <Button onClick={() => refetch()}>새로고침</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data?.reviews || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: data?.pagination.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `총 ${total}개`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize || 20);
          },
        }}
      />
    </div>
  );
};

export default ReviewList;
