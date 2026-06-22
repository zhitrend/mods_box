import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useModStore } from '../../stores/modStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../ui';
import { ModInfo } from '../../types';
import { Upload, FileArchive, Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function ModInstall() {
  const { addMod, gameConfig } = useModStore();
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleInstall = useCallback(async (filePath: string) => {
    if (!gameConfig) {
      setInstallResult({ success: false, message: '请先在设置中配置游戏路径' });
      return;
    }
    setInstalling(true);
    setInstallResult(null);
    try {
      const mod = await invoke<ModInfo>('install_mod', {
        filePath,
        strategy: 'smartMerge',
      });
      addMod(mod);
      setInstallResult({ success: true, message: `模组 "${mod.name}" 安装成功` });
    } catch (e) {
      setInstallResult({ success: false, message: `安装失败: ${e}` });
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.name.endsWith('.zip') || file.name.endsWith('.wotmod')) {
        const filePath = (file as any).path || file.name;
        await handleInstall(filePath);
      }
    }
  }, [handleInstall]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>安装模组</CardTitle>
          <CardDescription>
            支持 .zip 和 .wotmod 格式的模组文件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onClick={handleFileSelect}
          >
            {installing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在安装...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-sm text-muted-foreground">
                  支持 ZIP / WOTMOD 格式
                </p>
              </div>
            )}
          </div>

          {installResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                installResult.success
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {installResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {installResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>内置模组包</CardTitle>
          <CardDescription>一键安装预置的常用模组</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: 'XVM', desc: '综合模组包，战绩统计', icon: '⭐', version: '8.8.0' },
              { name: '瞄准辅助', desc: '自动瞄准、弱点标注', icon: '🎯', version: '1.0.0' },
              { name: '小地图增强', desc: '扩大地图、显示视野圈', icon: '🗺️', version: '1.2.0' },
              { name: '伤害面板', desc: '详细伤害统计与日志', icon: '📊', version: '2.0.1' },
            ].map((pkg) => (
              <div
                key={pkg.name}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <span className="text-2xl">{pkg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">{pkg.desc}</p>
                </div>
                <Badge variant="outline">v{pkg.version}</Badge>
                <Button size="sm" variant="secondary">
                  <Package className="h-4 w-4 mr-1" /> 安装
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
