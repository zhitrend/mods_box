import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { Card, Button, Input, Typography, Empty, Space, Tag, message, Modal } from 'antd';
import { SaveOutlined, ReloadOutlined, DeleteOutlined, ClockCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { BackupInfo } from '../../types';

const { Title, Text } = Typography;

export function BackupManager() {
  const { backups, setBackups } = useModStore();
  const [backupName, setBackupName] = useState('');
  const [backupDesc, setBackupDesc] = useState('');

  const loadBackups = async () => {
    try {
      const list = await invoke<BackupInfo[]>('list_backups');
      setBackups(list);
    } catch (e) {
      console.error('Load backups failed:', e);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    if (!backupName.trim()) return;
    try {
      await invoke('create_backup', {
        name: backupName,
        description: backupDesc,
      });
      setBackupName('');
      setBackupDesc('');
      loadBackups();
      message.success('备份创建成功');
    } catch (e) {
      message.error(`创建备份失败: ${e}`);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await invoke('restore_backup', { backupId: id });
      loadBackups();
      message.success('备份恢复成功');
    } catch (e) {
      message.error(`恢复备份失败: ${e}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_backup', { backupId: id });
      setBackups(backups.filter((b) => b.id !== id));
      message.success('备份已删除');
    } catch (e) {
      message.error(`删除备份失败: ${e}`);
    }
  };

  const confirmDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此备份吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => handleDelete(id),
    });
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>创建备份</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          备份当前模组配置和文件状态
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
          <label>
            <Text style={{ display: 'block', marginBottom: 4 }}>备份名称</Text>
            <Input
              placeholder="备份名称…"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              name="backup-name"
              autoComplete="off"
            />
          </label>
          <label>
            <Text style={{ display: 'block', marginBottom: 4 }}>备份描述</Text>
            <Input
              placeholder="备份描述（可选）…"
              value={backupDesc}
              onChange={(e) => setBackupDesc(e.target.value)}
              name="backup-desc"
              autoComplete="off"
            />
          </label>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleCreateBackup}
            disabled={!backupName.trim()}
            style={{ alignSelf: 'flex-start' }}
          >
            创建备份
          </Button>
        </div>
      </Card>

      <Card>
        <Title level={5}>备份列表</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          管理已创建的备份
        </Text>

        {backups.length === 0 ? (
          <Empty description="暂无备份" style={{ padding: 32 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {backups.map((backup) => (
              <div
                key={backup.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--armory-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text strong>{backup.name}</Text>
                    <Tag>{backup.mod_list.length} 个模组</Tag>
                  </div>
                  <Space size={16} style={{ fontSize: 12, color: 'var(--armory-text-dim)' }}>
                    <span>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {backup.created_at}
                    </span>
                    {backup.description && <span>{backup.description}</span>}
                  </Space>
                </div>
                <Space style={{ marginLeft: 16 }}>
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRestore(backup.id)}
                    aria-label="恢复备份"
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(backup.id)}
                    aria-label="删除备份"
                  />
                </Space>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
