import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  Tag,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { knowledgeBaseService, KnowledgeBase } from '../services/knowledgeBaseService';
const { TextArea } = Input;



const KnowledgeBasePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeBase | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['knowledgeBase'],
    queryFn: () => knowledgeBaseService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => knowledgeBaseService.create(data),
    onSuccess: () => {
      message.success('지식베이스가 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '생성에 실패했습니다');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      knowledgeBaseService.update(id, data),
    onSuccess: () => {
      message.success('지식베이스가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
      setIsModalVisible(false);
      setEditingItem(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '수정에 실패했습니다');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeBaseService.delete(id),
    onSuccess: () => {
      message.success('지식베이스가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '삭제에 실패했습니다');
    },
  });

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (item: KnowledgeBase) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const columns = [
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '질문 패턴',
      dataIndex: 'questionPattern',
      key: 'questionPattern',
      ellipsis: true,
    },
    {
      title: '답변 템플릿',
      dataIndex: 'answerTemplate',
      key: 'answerTemplate',
      ellipsis: true,
    },
    {
      title: '키워드',
      dataIndex: 'keywords',
      key: 'keywords',
      width: 200,
      render: (keywords: string[]) => (
        <>
          {keywords.slice(0, 3).map((keyword) => (
            <Tag key={keyword}>{keyword}</Tag>
          ))}
          {keywords.length > 3 && <Tag>+{keywords.length - 3}</Tag>}
        </>
      ),
    },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a: KnowledgeBase, b: KnowledgeBase) => a.priority - b.priority,
    },
    {
      title: '활성화',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>{enabled ? '활성' : '비활성'}</Tag>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 150,
      render: (_: any, record: KnowledgeBase) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="예"
            cancelText="아니오"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>지식베이스 관리</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          새 항목 추가
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={items || []}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingItem ? '지식베이스 수정' : '지식베이스 추가'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingItem(null);
          form.resetFields();
        }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="category"
            label="카테고리"
            rules={[{ required: true, message: '카테고리를 입력하세요' }]}
          >
            <Input placeholder="예: 버그, 기능 요청, 칭찬" />
          </Form.Item>

          <Form.Item
            name="questionPattern"
            label="질문 패턴"
            rules={[{ required: true, message: '질문 패턴을 입력하세요' }]}
          >
            <TextArea
              rows={2}
              placeholder="예: 앱이 느려요, 로그인이 안돼요"
            />
          </Form.Item>

          <Form.Item
            name="answerTemplate"
            label="답변 템플릿"
            rules={[{ required: true, message: '답변 템플릿을 입력하세요' }]}
          >
            <TextArea
              rows={4}
              placeholder="예: 소중한 의견 감사합니다. 해당 문제는 다음 업데이트에서 개선될 예정입니다."
            />
          </Form.Item>

          <Form.Item
            name="keywords"
            label="키워드"
            rules={[{ required: true, message: '키워드를 입력하세요' }]}
          >
            <Select mode="tags" placeholder="키워드를 입력하고 엔터를 누르세요" />
          </Form.Item>

          <Form.Item
            name="priority"
            label="우선순위"
            initialValue={0}
            rules={[{ required: true, message: '우선순위를 입력하세요' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="활성화"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBasePage;
