import React, { useState } from 'react';
import { Card, Upload, message, Typography, Divider } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { settingsService } from '../services/settingsService';

const { Title, Paragraph, Text } = Typography;

const Settings: React.FC = () => {
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json',
    beforeUpload: (file) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          // JSON parsing check here as safety
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
      
      // Prevent default upload behavior
      return false;
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
      
      <Card title="시스템 정보" size="small">
        <Paragraph>
          <FileTextOutlined /> 웹에서 업로드한 키 정보는 백엔드 서버의 안전한 경로에 덮어씌워 보관됩니다.
          (보안 상 서버 관리자만 접근 가능하도록 유의하세요)
        </Paragraph>
      </Card>
    </div>
  );
};

export default Settings;
