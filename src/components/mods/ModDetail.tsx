import { ModInfo, CATEGORY_LABELS, STATUS_LABELS } from '../../types';
import { Modal, Descriptions, Tag, Typography } from 'antd';
import { WarningOutlined, FileOutlined } from '@ant-design/icons';
import { formatFileSize } from '../../lib/utils';

const { Text } = Typography;

interface ModDetailProps {
  mod: ModInfo;
  onClose: () => void;
}

export function ModDetail({ mod, onClose }: ModDetailProps) {
  return (
    <Modal
      title={
        <div>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{mod.name}</span>
          <div style={{ fontSize: 13, color: 'var(--armory-text-secondary)', fontWeight: 400, marginTop: 2 }}>
            v{mod.version} by {mod.author}
          </div>
        </div>
      }
      open
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">{mod.description || '暂无描述'}</Text>
      </div>

      <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="分类">
          <Tag>{CATEGORY_LABELS[mod.category]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={mod.enabled ? 'green' : 'default'}>{STATUS_LABELS[mod.status]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="游戏版本">v{mod.game_version}</Descriptions.Item>
        <Descriptions.Item label="文件大小">{formatFileSize(mod.file_size)}</Descriptions.Item>
        <Descriptions.Item label="安装时间">{mod.installed_at}</Descriptions.Item>
        <Descriptions.Item label="来源">{mod.source ? '本地文件' : '内置包'}</Descriptions.Item>
      </Descriptions>

      {mod.tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>标签</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {mod.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      )}

      {mod.conflicts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>
            <WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
            冲突文件
          </Text>
          <div style={{ maxHeight: 128, overflow: 'auto' }}>
            {mod.conflicts.map((conflict, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,77,79,0.04)', borderRadius: 4, marginBottom: 2, fontSize: 12, color: 'var(--armory-error)' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conflict.file_path}</span>
                <Tag style={{ flexShrink: 0, marginLeft: 8 }}>{conflict.resolution}</Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Text strong style={{ display: 'block', marginBottom: 4 }}>
          <FileOutlined style={{ marginRight: 4 }} />
          安装文件 ({mod.files.length})
        </Text>
        <div style={{ maxHeight: 160, overflow: 'auto' }}>
          {mod.files.map((file, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', background: 'rgba(128,128,128,0.04)', borderRadius: 4, marginBottom: 2, fontSize: 12 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--armory-text-secondary)' }}>{file.relative_path}</span>
              <span style={{ flexShrink: 0, marginLeft: 8, color: 'var(--armory-text-dim)' }}>{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
