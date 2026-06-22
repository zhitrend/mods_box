import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useModStore } from '../../stores/modStore';
import { Card, Button, Typography, Tag, Upload, message, Row, Col } from 'antd';
import { InboxOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { ModInfo } from '../../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export function ModInstall() {
  const { addMod, gameConfig } = useModStore();
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async (filePath: string) => {
    if (!gameConfig) {
      message.error('请先在设置中配置游戏路径');
      return;
    }
    setInstalling(true);
    try {
      const mod = await invoke<ModInfo>('install_mod', {
        filePath,
        strategy: 'smartMerge',
      });
      addMod(mod);
      message.success(`模组 "${mod.name}" 安装成功`);
    } catch (e) {
      message.error(`安装失败: ${e}`);
    } finally {
      setInstalling(false);
    }
  }, [gameConfig, addMod]);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '模组包',
          extensions: ['zip', 'wotmod'],
        }],
      });
      if (selected) {
        await handleInstall(selected);
      }
    } catch (e) {
      console.error('File selection failed:', e);
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>安装模组</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          支持 .zip 和 .wotmod 格式的模组文件
        </Text>

        <Dragger
          disabled={installing}
          showUploadList={false}
          beforeUpload={(file) => {
            const filePath = (file as any).path || file.name;
            handleInstall(filePath);
            return false;
          }}
          style={{ marginBottom: 16 }}
        >
          {installing ? (
            <div>
              <LoadingOutlined style={{ fontSize: 40, color: '#1677ff' }} />
              <p style={{ marginTop: 8, color: 'rgba(128,128,128,0.75)' }}>正在安装...</p>
            </div>
          ) : (
            <div>
              <InboxOutlined style={{ fontSize: 40, color: 'rgba(128,128,128,0.45)' }} />
              <p style={{ marginTop: 8, fontWeight: 500 }}>拖拽文件到此处，或点击选择文件</p>
              <p style={{ color: 'rgba(128,128,128,0.65)' }}>支持 ZIP / WOTMOD 格式</p>
            </div>
          )}
        </Dragger>
      </Card>

      <Card>
        <Title level={5}>内置模组包</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>一键安装预置的常用模组</Text>
        <Row gutter={[12, 12]}>
          {[
            { name: 'XVM', desc: '综合模组包，战绩统计', icon: '⭐', version: '8.8.0' },
            { name: '瞄准辅助', desc: '自动瞄准、弱点标注', icon: '🎯', version: '1.0.0' },
            { name: '小地图增强', desc: '扩大地图、显示视野圈', icon: '🗺️', version: '1.2.0' },
            { name: '伤害面板', desc: '详细伤害统计与日志', icon: '📊', version: '2.0.1' },
          ].map((pkg) => (
            <Col key={pkg.name} xs={24} sm={12}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(128,128,128,0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                className="hoverable-card"
              >
                <span style={{ fontSize: 24 }}>{pkg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 14 }}>{pkg.name}</Text>
                  <div style={{ fontSize: 12, color: 'rgba(128,128,128,0.65)' }}>{pkg.desc}</div>
                </div>
                <Tag>v{pkg.version}</Tag>
                <Button size="small" icon={<DownloadOutlined />}>
                  安装
                </Button>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
