import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { Card, Button, Input, Select, Typography, Alert, Space, Tag } from 'antd';
import {
  FolderOpenOutlined,
  PlayCircleOutlined,
  ScanOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { GameConfig, REGION_LABELS } from '../../types';

const { Title, Text } = Typography;

export function Settings() {
  const { gameConfig, setGameConfig } = useModStore();
  const [gamePath, setGamePath] = useState('');
  const [region, setRegion] = useState('EU');
  const [detecting, setDetecting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (gameConfig) {
      setGamePath(gameConfig.install_path);
      setRegion(gameConfig.region);
    }
  }, [gameConfig]);

  const handleDetect = async () => {
    setDetecting(true);
    setStatus(null);
    try {
      const config = await invoke<GameConfig>('detect_game');
      setGameConfig(config);
      setGamePath(config.install_path);
      setRegion(config.region);
      setStatus({ type: 'success', message: `检测到游戏路径: ${config.install_path}` });
    } catch (e) {
      setStatus({ type: 'error', message: `检测失败: ${e}` });
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    setStatus(null);
    try {
      const config = await invoke<GameConfig>('set_game_path', {
        path: gamePath,
        region,
      });
      setGameConfig(config);
      setStatus({ type: 'success', message: '配置已保存' });
    } catch (e) {
      setStatus({ type: 'error', message: `保存失败: ${e}` });
    }
  };

  const handleLaunch = async () => {
    try {
      await invoke('launch_game');
    } catch (e) {
      setStatus({ type: 'error', message: `启动失败: ${e}` });
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>游戏设置</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          配置坦克世界游戏路径和区服
        </Text>

        <div style={{ marginBottom: 16 }}>
          <Button onClick={handleDetect} disabled={detecting} loading={detecting} icon={<ScanOutlined />}>
            自动检测
          </Button>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>扫描注册表和常见安装目录</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>游戏安装路径</Text>
            <Input
              value={gamePath}
              onChange={(e) => setGamePath(e.target.value)}
              placeholder="C:\\Games\\World_of_Tanks…"
              name="game-path"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>区服</Text>
          <Select
            value={region}
            onChange={setRegion}
            options={Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }))}
            style={{ width: '100%' }}
          />
        </label>

        {gameConfig && (
            <div style={{ padding: 12, background: 'var(--armory-gold-glow)', borderRadius: 6, marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
              <Text>游戏版本: v{gameConfig.version}</Text>
            </div>
            <div>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
              <Text>模组目录: {gameConfig.res_mods_dir}</Text>
            </div>
          </div>
        )}

        {status && (
          <Alert
            message={status.message}
            type={status.type}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Space>
          <Button type="primary" icon={<FolderOpenOutlined />} onClick={handleSave}>
            保存配置
          </Button>
          <Button icon={<PlayCircleOutlined />} onClick={handleLaunch}>
            启动游戏
          </Button>
        </Space>
      </Card>

      <Card>
        <Title level={5}>通用设置</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>应用通用配置</Text>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Text strong>开机自启</Text>
            <div style={{ fontSize: 12, color: 'var(--armory-text-dim)' }}>开机时自动启动并常驻托盘</div>
          </div>
          <Tag color="default" style={{ fontSize: 11 }}>即将推出</Tag>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong>文件关联</Text>
            <div style={{ fontSize: 12, color: 'var(--armory-text-dim)' }}>关联 .wotmod 文件格式</div>
          </div>
          <Tag color="default" style={{ fontSize: 11 }}>即将推出</Tag>
        </div>
      </Card>
    </div>
  );
}
