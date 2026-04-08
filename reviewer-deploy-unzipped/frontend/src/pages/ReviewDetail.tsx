import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Rate,
  Tag,
  message,
  Space,
  Radio,
  Input,
  Spin,
  Divider,
  List,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reviewService, Review } from '../services/reviewService';

const { TextArea } = Input;

const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [customReply, setCustomReply] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const { data: review, isLoading } = useQuery<Review>({
    queryKey: ['review', id],
    queryFn: () => reviewService.getReview(id!),
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: (data: { suggestionId?: string; customReply?: string }) =>
      reviewService.replyToReview(id!, data),
    onSuccess: () => {
      message.success('답변이 성공적으로 게시되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '답변 게시에 실패했습니다');
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: () => reviewService.ignoreReview(id!),
    onSuccess: () => {
      message.success('리뷰를 무시했습니다');
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
      navigate('/reviews');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '작업에 실패했습니다');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => reviewService.regenerateSuggestions(id!),
    onSuccess: () => {
      message.success('답변을 재생성했습니다');
      queryClient.invalidateQueries({ queryKey: ['review', id] });
      setSelectedSuggestionId(null);
      setUseCustom(false);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.error || '재생성에 실패했습니다');
    },
  });

  const handleSubmit = () => {
    if (useCustom) {
      if (!customReply.trim()) {
        message.warning('답변을 입력하세요');
        return;
      }
      replyMutation.mutate({ customReply: customReply.trim() });
    } else {
      if (!selectedSuggestionId) {
        message.warning('답변을 선택하세요');
        return;
      }
      replyMutation.mutate({ suggestionId: selectedSuggestionId });
    }
  };

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  if (!review) {
    return <div>리뷰를 찾을 수 없습니다</div>;
  }

  const isPending = review.status === 'PENDING';

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/reviews')}
        style={{ marginBottom: 16 }}
      >
        목록으로
      </Button>

      <Card
        title="리뷰 상세"
        extra={
          <Tag
            color={
              review.status === 'PENDING'
                ? 'orange'
                : review.status === 'ANSWERED'
                ? 'green'
                : 'red'
            }
          >
            {review.status === 'PENDING'
              ? '대기'
              : review.status === 'ANSWERED'
              ? '완료'
              : '무시'}
          </Tag>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <strong>사용자:</strong> {review.userName}
          </div>
          <div>
            <strong>평점:</strong> <Rate disabled defaultValue={review.rating} />
          </div>
          <div>
            <strong>언어:</strong> <Tag>{review.language.toUpperCase()}</Tag>
          </div>
          <div>
            <strong>등록일:</strong> {dayjs(review.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </div>
          <Divider />
          <div>
            <strong>리뷰 내용:</strong>
            <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              {review.text}
            </div>
          </div>
        </Space>
      </Card>

      {isPending && (
        <Card title="AI 생성 답변" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => regenerateMutation.mutate()}
              loading={regenerateMutation.isPending}
            >
              답변 재생성
            </Button>

            <Radio.Group
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'custom') {
                  setUseCustom(true);
                  setSelectedSuggestionId(null);
                } else {
                  setUseCustom(false);
                  setSelectedSuggestionId(value);
                }
              }}
              value={useCustom ? 'custom' : selectedSuggestionId}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {review.suggestions.map((suggestion, index) => (
                  <Radio key={suggestion.id} value={suggestion.id}>
                    <Card size="small" style={{ marginLeft: 24 }}>
                      <div>
                        <strong>옵션 {index + 1}</strong>
                      </div>
                      <div style={{ marginTop: 8 }}>{suggestion.suggestionTextKr}</div>
                    </Card>
                  </Radio>
                ))}
                <Radio value="custom">
                  <div style={{ marginLeft: 24 }}>직접 작성</div>
                </Radio>
              </Space>
            </Radio.Group>

            {useCustom && (
              <TextArea
                rows={4}
                placeholder="답변을 입력하세요 (한글로 작성하면 자동으로 번역됩니다)"
                value={customReply}
                onChange={(e) => setCustomReply(e.target.value)}
                style={{ marginLeft: 48 }}
              />
            )}

            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
                loading={replyMutation.isPending}
              >
                답변 게시
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => ignoreMutation.mutate()}
                loading={ignoreMutation.isPending}
              >
                무시하기
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      {review.replies.length > 0 && (
        <Card title="답변 히스토리" style={{ marginTop: 16 }}>
          <List
            dataSource={review.replies}
            renderItem={(reply) => (
              <List.Item>
                <List.Item.Meta
                  title={`${dayjs(reply.repliedAt).format('YYYY-MM-DD HH:mm:ss')} - ${
                    reply.repliedBy === 'web' ? '웹' : '텔레그램'
                  }`}
                  description={reply.replyText}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};

export default ReviewDetail;
