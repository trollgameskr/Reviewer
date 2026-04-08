import React, { useState, useEffect } from 'react';
import { Card, Upload, message, Typography, Divider, Form, Input, Button, Select, Space, Switch, InputNumber, Tabs, Alert } from 'antd';
import { UploadOutlined, FileTextOutlined, SaveOutlined, SendOutlined, RobotOutlined, MessageOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { settingsService, AIConfig, TelegramConfig, PromptConfig } from '../services/settingsService';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Settings: React.FC = () => {
  // 서비스 계정
  const [uploading, setUploading] = useState(false);

  // AI 모델 설정
  const [aiForm] = Form.useForm<AIConfig>();
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'azure'>('openai');

  // 텔레그램 설정
  const [telegramForm] = Form.useForm();
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTokenSet, setTelegramTokenSet] = useState(false);
  const [telegramTokenMasked, setTelegramTokenMasked] = useState('');

  // AI 프롬프트 설정
  const [promptForm] = Form.useForm<PromptConfig>();
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    loadAiConfig();
    loadTelegramConfig();
    loadPromptConfig();
  }, []);

  // ─── AI 모델 설정 ──────────────────────────────────────
  const loadAiConfig = async () => {
    try {
      const config = await settingsService.getAiConfig();
      aiForm.setFieldsValue(config);
      if (config.provider) {
        setProvider(config.provider);
      }
    } catch (error) {
      console.error('Failed to load AI config', error);
    }
  };

  const handleAiConfigSave = async (values: AIConfig) => {
    setSavingAiConfig(true);
    try {
      const res = await settingsService.saveAiConfig(values);
      if (res.success) {
        message.success(res.message);
      }
    } catch (error) {
      console.error(error);
      message.error('AI 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingAiConfig(false);
    }
  };

  // ─── 텔레그램 설정 ─────────────────────────────────────
  const loadTelegramConfig = async () => {
    try {
      const config = await settingsService.getTelegramConfig();
      telegramForm.setFieldsValue({
        chatId: config.chatId,
        enabled: config.enabled,
      });
      setTelegramTokenSet(config.botTokenSet || false);
      setTelegramTokenMasked(config.botTokenMasked || '');
    } catch (error) {
      console.error('Failed to load telegram config', error);
    }
  };

  const handleTelegramSave = async (values: any) => {
    setSavingTelegram(true);
    try {
      const payload: Partial<TelegramConfig> = {
        chatId: values.chatId,
        enabled: values.enabled,
      };
      // botToken이 입력된 경우에만 전송 (마스킹 값은 무시)
      if (values.botToken && values.botToken.trim()) {
        payload.botToken = values.botToken.trim();
      }
      const res = await settingsService.saveTelegramConfig(payload);
      if (res.success) {
        message.success(res.message);
        loadTelegramConfig(); // 마스킹 값 갱신
        telegramForm.setFieldValue('botToken', ''); // 입력 필드 초기화
      }
    } catch (error) {
      console.error(error);
      message.error('텔레그램 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleTelegramTest = async () => {
    setTestingTelegram(true);
    try {
      const res = await settingsService.testTelegram();
      if (res.success) {
        message.success(res.message);
      } else {
        message.error(res.message);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || '텔레그램 연결 테스트에 실패했습니다.';
      message.error(errMsg);
    } finally {
      setTestingTelegram(false);
    }
  };

  // ─── AI 프롬프트 설정 ──────────────────────────────────
  const loadPromptConfig = async () => {
    try {
      const config = await settingsService.getPromptConfig();
      promptForm.setFieldsValue(config);
    } catch (error) {
      console.error('Failed to load prompt config', error);
    }
  };

  const handlePromptSave = async (values: PromptConfig) => {
    setSavingPrompt(true);
    try {
      const res = await settingsService.savePromptConfig(values);
      if (res.success) {
        message.success(res.message);
      }
    } catch (error) {
      console.error(error);
      message.error('프롬프트 설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingPrompt(false);
    }
  };

  // ─── 서비스 계정 업로드 ────────────────────────────────
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json',
    beforeUpload: (file) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content);

          setUploading(true);
          const res = await settingsService.uploadServiceAccount(content);
          if (res.success) {
            message.success(res.message || '서비스 계정 키가 성공적으로 업로드되었습니다.');
          }
        } catch (error) {
          message.error('유효하지 않은 JSON 파일이거나 업로드 중 오류가 발생했습니다.');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsText(file);
      return false;
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  // ─── 탭 아이템 정의 ────────────────────────────────────
  const tabItems = [
    {
      key: 'telegram',
      label: (
        <span>
          <SendOutlined /> 텔레그램
        </span>
      ),
      children: (
        <>
          <Paragraph>
            새 리뷰 알림을 텔레그램으로 받고, 텔레그램에서 바로 답변할 수 있습니다.
          </Paragraph>
          <Form
            form={telegramForm}
            layout="vertical"
            onFinish={handleTelegramSave}
            initialValues={{ enabled: true }}
          >
            <Form.Item label="봇 활성화" name="enabled" valuePropName="checked">
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>

            <Form.Item
              label="Bot Token"
              name="botToken"
              help={
                telegramTokenSet
                  ? `현재 설정된 토큰: ${telegramTokenMasked} (변경하려면 새 토큰을 입력하세요)`
                  : '텔레그램 @BotFather에서 발급받은 토큰을 입력하세요'
              }
            >
              <Input.Password placeholder={telegramTokenSet ? '(변경 시에만 입력)' : '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'} />
            </Form.Item>

            <Form.Item
              label="Chat ID"
              name="chatId"
              rules={[{ required: true, message: 'Chat ID를 입력하세요' }]}
              help="알림을 받을 채팅방/그룹 ID입니다. @userinfobot 등으로 확인할 수 있습니다."
            >
              <Input placeholder="-1001234567890" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={savingTelegram} icon={<SaveOutlined />}>
                  설정 저장
                </Button>
                <Button onClick={handleTelegramTest} loading={testingTelegram} icon={<MessageOutlined />}>
                  연결 테스트
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      ),
    },
    {
      key: 'ai-model',
      label: (
        <span>
          <RobotOutlined /> AI 모델
        </span>
      ),
      children: (
        <>
          <Paragraph>
            답변 추천에 사용할 AI 공급자를 선택하고 키 정보를 설정하세요.
          </Paragraph>
          <Form 
            form={aiForm} 
            layout="vertical" 
            onFinish={handleAiConfigSave}
            initialValues={{ provider: 'openai' }}
          >
            <Form.Item label="공급자 (Provider)" name="provider" rules={[{ required: true }]}>
              <Select onChange={(val) => setProvider(val as any)}>
                <Option value="openai">OpenAI (Standard)</Option>
                <Option value="azure">Azure OpenAI</Option>
              </Select>
            </Form.Item>

            {provider === 'azure' ? (
              <>
                <Form.Item label="Azure Endpoint" name="endpoint" rules={[{ required: true, message: 'Endpoint를 입력하세요' }]}>
                  <Input placeholder="https://YOUR_RESOURCE_NAME.openai.azure.com/openai/v1/" />
                </Form.Item>
                <Form.Item label="Deployment Name (Azure)" name="deploymentName" rules={[{ required: true, message: 'Deployment Name을 입력하세요' }]}>
                  <Input placeholder="gpt-4-turbo-preview" />
                </Form.Item>
                <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'API Key를 입력하세요' }]}>
                  <Input.Password placeholder="Azure OpenAI API 키" />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item label="Model" name="model" rules={[{ required: true, message: '모델명을 입력하세요' }]}>
                  <Input placeholder="gpt-4-turbo-preview" />
                </Form.Item>
                <Form.Item label="API Key (비워두면 서버 .env 값 사용)" name="apiKey">
                  <Input.Password placeholder="sk-..." />
                </Form.Item>
              </>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={savingAiConfig} icon={<SaveOutlined />}>
                설정 저장
              </Button>
            </Form.Item>
          </Form>
        </>
      ),
    },
    {
      key: 'ai-prompt',
      label: (
        <span>
          <FileTextOutlined /> AI 프롬프트
        </span>
      ),
      children: (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="프롬프트 변수"
            description={
              <span>
                사용자 프롬프트 템플릿에서 다음 변수를 사용할 수 있습니다:{' '}
                <Text code>{'{context}'}</Text> (지식 베이스),{' '}
                <Text code>{'{userName}'}</Text> (사용자 이름),{' '}
                <Text code>{'{rating}'}</Text> (평점),{' '}
                <Text code>{'{reviewText}'}</Text> (리뷰 내용)
              </span>
            }
          />
          <Form
            form={promptForm}
            layout="vertical"
            onFinish={handlePromptSave}
          >
            <Form.Item
              label="시스템 프롬프트 (System Prompt)"
              name="systemPrompt"
              rules={[{ required: true, message: '시스템 프롬프트를 입력하세요' }]}
              help="AI의 역할과 동작 방식을 정의하는 시스템 메시지입니다."
            >
              <TextArea rows={6} placeholder="당신은 구글 플레이 스토어 앱 개발자입니다..." />
            </Form.Item>

            <Form.Item
              label="사용자 프롬프트 템플릿 (User Prompt Template)"
              name="userPromptTemplate"
              rules={[{ required: true, message: '사용자 프롬프트 템플릿을 입력하세요' }]}
              help="리뷰 데이터가 삽입될 프롬프트 템플릿입니다."
            >
              <TextArea rows={12} placeholder="{context}&#10;&#10;사용자 정보:&#10;- 이름: {userName}..." />
            </Form.Item>

            <Form.Item label="Temperature" name="temperature" help="값이 높을수록 창의적, 낮을수록 일관된 답변 (0.0 ~ 2.0)">
              <InputNumber min={0} max={2} step={0.1} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item label="Max Tokens" name="maxTokens" help="최대 토큰 수 (답변 길이 제한)">
              <InputNumber min={100} max={4000} step={100} style={{ width: 120 }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={savingPrompt} icon={<SaveOutlined />}>
                프롬프트 저장
              </Button>
            </Form.Item>
          </Form>
        </>
      ),
    },
    {
      key: 'service-account',
      label: (
        <span>
          <UploadOutlined /> 서비스 계정
        </span>
      ),
      children: (
        <>
          <Paragraph>
            Google Play Console 리뷰 API 등에 접근하기 위해서는 서비스 계정 키 파일(.json)이 필요합니다.
            <br/>
            발급받은 <Text code>service-account-key.json</Text> 파일을 아래에 업로드해주세요.
          </Paragraph>
          
          <Upload.Dragger {...uploadProps} showUploadList={false}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">클릭하거나 파일을 이 영역으로 드래그하여 업로드하세요</p>
            <p className="ant-upload-hint">단일 JSON 키 파일만 업로드할 수 있습니다.</p>
          </Upload.Dragger>
        </>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 50 }}>
      <Title level={2}>환경 설정</Title>
      
      <Card style={{ marginTop: 24 }}>
        <Tabs items={tabItems} defaultActiveKey="telegram" />
      </Card>

      <Divider />
      
      <Card title="시스템 정보" size="small">
        <Paragraph>
          <FileTextOutlined /> 웹에서 저장한 정보는 백엔드 서버의 안전한 로컬 경로(<Text code>credentials/</Text> 폴더)에 파일로 보관됩니다.
          보안 상 서버 관리자만 접근 가능하도록 유의하세요.
        </Paragraph>
      </Card>
    </div>
  );
};

export default Settings;
