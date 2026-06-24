import { ModInfo, CATEGORY_LABELS, STATUS_LABELS } from '../../types';
import { Card, Tag, Switch, Button, Tooltip, Modal } from 'antd';
import { DeleteOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { formatFileSize } from '../../lib/utils';

interface ModCardProps {
  mod: ModInfo;
  onToggle: (id: string) => void;
  onUninstall: (id: string) => void;
  onDetail: (mod: ModInfo) => void;
}

const statusColorMap: Record<string, string> = {
  Enabled: 'green',
  Disabled: 'default',
  Conflict: 'red',
  Outdated: 'orange',
  Incompatible: 'red',
  Error: 'red',
};

const categoryColorMap: Record<string, string> = {
  Aiming: 'blue',
  Crosshair: 'purple',
  DamagePanel: 'cyan',
  Garage: 'geekblue',
  Minimap: 'green',
  Sound: 'magenta',
  Visual: 'orange',
  Utility: 'lime',
  XVM: 'gold',
  Other: 'default',
};

export function ModCard({ mod, onToggle, onUninstall, onDetail }: ModCardProps) {
  const handleUninstallClick = () => {
    Modal.confirm({
      title: '确认卸载',
      content: `确定要卸载 "${mod.name}" 吗？`,
      okText: '卸载',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => onUninstall(mod.id),
    });
  };

  return (
    <Card
      size="small"
      className="hoverable-card animate-in"
      style={{ 
        position: 'relative', 
        borderLeft: mod.enabled ? '4px solid var(--armory-gold)' : '4px solid var(--armory-border)',
        borderRadius: 'var(--armory-radius-md)',
        background: 'var(--armory-elevated)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--armory-spacing-md)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--armory-spacing-sm)', marginBottom: 'var(--armory-spacing-xs)' }}>
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--armory-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mod.name}
            </span>
            {mod.status === 'Conflict' && (
              <Tooltip title="存在模组冲突">
                <WarningOutlined style={{ color: 'var(--armory-error)', fontSize: 14 }} />
              </Tooltip>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--armory-text-secondary)', marginBottom: 'var(--armory-spacing-sm)', fontFamily: 'Rajdhani, sans-serif' }}>
            v{mod.version} <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span> {mod.author}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--armory-spacing-xs)', alignItems: 'center' }}>
            <Tag color={statusColorMap[mod.status] || 'default'} style={{ borderRadius: 'var(--armory-radius-sm)', fontWeight: 500 }}>{STATUS_LABELS[mod.status]}</Tag>
            <Tag color={categoryColorMap[mod.category] || 'default'} style={{ borderRadius: 'var(--armory-radius-sm)', fontWeight: 500 }}>{CATEGORY_LABELS[mod.category]}</Tag>
            <span style={{ fontSize: 11, color: 'var(--armory-text-dim)', marginLeft: 'var(--armory-spacing-xs)', fontFamily: 'monospace' }}>{formatFileSize(mod.file_size)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--armory-spacing-xs)', flexShrink: 0 }}>
          <Switch
            checked={mod.enabled}
            onChange={() => onToggle(mod.id)}
            size="small"
          />
          <Tooltip title="详情">
            <Button type="text" size="small" icon={<InfoCircleOutlined />} onClick={() => onDetail(mod)} style={{ color: 'var(--armory-text-secondary)' }} />
          </Tooltip>
          <Tooltip title="卸载">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={handleUninstallClick} />
          </Tooltip>
        </div>
      </div>

      {mod.conflicts.length > 0 && (
        <div style={{ 
          marginTop: 'var(--armory-spacing-sm)', 
          padding: '6px 10px', 
          background: 'var(--armory-error-glow)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: 'var(--armory-radius-sm)', 
          fontSize: 12, 
          color: 'var(--armory-error)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--armory-spacing-sm)' 
        }}>
          <WarningOutlined style={{ fontSize: 12 }} />
          <span style={{ fontWeight: 500 }}>与 {mod.conflicts.length} 个文件存在冲突</span>
        </div>
      )}
    </Card>
  );
}
