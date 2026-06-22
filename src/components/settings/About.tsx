import { Card, Typography, Divider } from 'antd';

const { Title, Text, Paragraph } = Typography;

export function About() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }} aria-hidden="true">🎮</div>
          <Title level={3}>WoT Mods Manager</Title>
          <Text type="secondary">v0.1.0</Text>
        </div>

        <Divider />

        <Paragraph>
          坦克世界（World of Tanks）模组管理桌面客户端。
        </Paragraph>
        <Paragraph>
          为坦克世界玩家提供一个轻量、安全、易用的模组管理工具。
        </Paragraph>

        <Divider />

        <Title level={5}>技术栈</Title>
        <Paragraph type="secondary">
          Rust + Tauri v2 + React + TypeScript + Ant Design
        </Paragraph>

        <Title level={5}>功能特性</Title>
        <ul style={{ color: 'rgba(128,128,128,0.75)', lineHeight: 2 }}>
          <li>模组安装、启用/禁用、卸载</li>
          <li>冲突检测与解决</li>
          <li>游戏路径自动检测</li>
          <li>备份与恢复</li>
          <li>亮色/暗色主题</li>
        </ul>
      </Card>
    </div>
  );
}
