import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input } from '../ui';
import { BackupInfo } from '../../types';
import { Save, RotateCcw, Trash2, Clock, Database } from 'lucide-react';
import { formatFileSize } from '../../lib/utils';

export function BackupManager() {
  const { backups, setBackups, mods } = useModStore();
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
    } catch (e) {
      console.error('Create backup failed:', e);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await invoke('restore_backup', { backupId: id });
      loadBackups();
    } catch (e) {
      console.error('Restore backup failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_backup', { backupId: id });
      setBackups(backups.filter((b) => b.id !== id));
    } catch (e) {
      console.error('Delete backup failed:', e);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>创建备份</CardTitle>
          <CardDescription>备份当前模组配置和文件状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="备份名称"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
          />
          <Input
            placeholder="备份描述（可选）"
            value={backupDesc}
            onChange={(e) => setBackupDesc(e.target.value)}
          />
          <Button onClick={handleCreateBackup} disabled={!backupName.trim()}>
            <Save className="h-4 w-4 mr-2" /> 创建备份
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>备份列表</CardTitle>
          <CardDescription>管理已创建的备份</CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">暂无备份</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{backup.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {backup.mod_list.length} 个模组
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {backup.created_at}
                      </span>
                      {backup.description && <span>{backup.description}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(backup.id)}
                      title="恢复"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(backup.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
