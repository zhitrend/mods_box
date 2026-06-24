import { useState } from 'react';
import { Modal, Alert, Select, Tag, Typography, Space, Divider } from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { ConflictInfo } from '../../types';

const { Text } = Typography;

const GRADE_CONFIG = {
  High: { color: 'red', label: '高', icon: <ExclamationCircleOutlined /> },
  Medium: { color: 'orange', label: '中', icon: <WarningOutlined /> },
  Low: { color: 'blue', label: '低', icon: <InfoCircleOutlined /> },
};

const STRATEGY_OPTIONS = [
  { value: 'smartMerge', label: '智能合并 - 按优先级保留文件' },
  { value: 'overwrite', label: '覆盖 - 新文件覆盖旧文件' },
  { value: 'skip', label: '跳过 - 保留现有文件' },
  { value: 'rename', label: '重命名 - 新文件重命名后安装' },
  { value: 'isolate', label: '隔离 - 安装在独立子目录' },
];

interface ConflictResolverProps {
  modName: string;
  conflicts: ConflictInfo[];
  onResolve: (strategy: string) => void;
  onCancel: () => void;
}

export function ConflictResolver({ modName, conflicts, onResolve, onCancel }: ConflictResolverProps) {
  const [strategy, setStrategy] = useState('smartMerge');
  const hasHigh = conflicts.some((c) => c.grade === 'High');

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <span>检测到文件冲突</span>
        </Space>
      }
      open
      onCancel={onCancel}
      onOk={() => onResolve(strategy)}
      okText="确认安装"
      cancelText="取消"
      width={680}
      okButtonProps={{ danger: hasHigh }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          模组 <Text strong>{modName}</Text> 与已安装的模组存在 {conflicts.length} 个文件冲突
        </Text>
      </div>

      {hasHigh && (
        <Alert
          message="存在高风险冲突"
          description="部分文件被多个模组修改且内容不同，强行安装可能导致模组功能异常"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>处理策略</Text>
        <Select
          value={strategy}
          onChange={setStrategy}
          options={STRATEGY_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        冲突文件列表 ({conflicts.length})
      </Text>

      <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {conflicts.map((conflict, i) => {
          const grade = GRADE_CONFIG[conflict.grade];
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 4,
                background: conflict.grade === 'High'
                  ? 'var(--armory-error-glow)'
                  : conflict.grade === 'Medium'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'transparent',
                border: conflict.grade === 'High'
                  ? '1px solid rgba(239, 68, 68, 0.2)'
                  : '1px solid transparent',
                fontSize: 12,
              }}
            >
              <Tag
                color={grade.color}
                style={{ flexShrink: 0, margin: 0, fontSize: 11 }}
              >
                {grade.label}
              </Tag>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--armory-text-secondary)',
                  fontFamily: 'monospace',
                }}
              >
                {conflict.file_path}
              </span>
              {conflict.conflict_with.length > 0 && (
                <Tag style={{ flexShrink: 0, margin: 0, fontSize: 11 }}>
                  {conflict.conflict_with.length} 个模组
                </Tag>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
