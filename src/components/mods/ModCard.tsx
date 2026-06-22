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
      hoverable
      style={{ position: 'relative' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {mod.name}
            </span>
            {mod.status === 'Conflict' && (
              <WarningOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--armory-text-secondary)', marginBottom: 8 }}>
            v{mod.version} · {mod.author}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <Tag color={statusColorMap[mod.status] || 'default'}>{STATUS_LABELS[mod.status]}</Tag>
            <Tag color={categoryColorMap[mod.category] || 'default'}>{CATEGORY_LABELS[mod.category]}</Tag>
            <span style={{ fontSize: 12, color: 'var(--armory-text-dim)' }}>{formatFileSize(mod.file_size)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <Switch
            checked={mod.enabled}
            onChange={() => onToggle(mod.id)}
            size="small"
          />
          <Tooltip title="详情">
            <Button type="text" size="small" icon={<InfoCircleOutlined />} onClick={() => onDetail(mod)} aria-label="查看详情" />
          </Tooltip>
          <Tooltip title="卸载">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={handleUninstallClick} aria-label="卸载模组" />
          </Tooltip>
        </div>
      </div>

      {mod.conflicts.length > 0 && (
        <div style={{ marginTop: 8, padding: 6, background: 'rgba(255,77,79,0.08)', borderRadius: 4, fontSize: 12, color: 'var(--armory-error)' }}>
          与 {mod.conflicts.length} 个文件存在冲突
        </div>
      )}
    </Card>
  );
}
