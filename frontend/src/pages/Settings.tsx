import React, { useState, useEffect } from 'react';
import { Card, Upload, message, Typography, Divider, Form, Input, Button, Select, Space } from 'antd';
import { UploadOutlined, FileTextOutlined, SaveOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { settingsService, AIConfig } from '../services/settingsService';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [aiForm] = Form.useForm<AIConfig>();
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [provider, setProvider] = useState<'openai' | 'azure'>('openai');

  useEffect(() => {
    loadAiConfig();
  }, []);

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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 50 }}>
      <Title level={2}>환경 설정</Title>
      
      <Card title="서비스 계정 (Service Account) 관리" style={{ marginTop: 24 }}>
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
      </Card>
      
      <Divider />

      <Card title="AI 모델 및 공급자 설정" style={{ marginTop: 24 }}>
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
