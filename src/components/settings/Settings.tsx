import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../ui';
import { GameConfig, REGION_LABELS } from '../../types';
import { FolderOpen, Play, ScanLine, CheckCircle, AlertCircle } from 'lucide-react';

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
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>游戏设置</CardTitle>
          <CardDescription>配置坦克世界游戏路径和区服</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={handleDetect} disabled={detecting} variant="secondary">
              <ScanLine className="h-4 w-4 mr-2" />
              {detecting ? '检测中...' : '自动检测'}
            </Button>
            <span className="text-xs text-muted-foreground">
              扫描注册表和常见安装目录
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">游戏安装路径</label>
            <div className="flex gap-2">
              <Input
                value={gamePath}
                onChange={(e) => setGamePath(e.target.value)}
                placeholder="C:\\Games\\World_of_Tanks"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">区服</label>
            <Select
              options={Object.entries(REGION_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          {gameConfig && (
            <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>游戏版本: v{gameConfig.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>模组目录: {gameConfig.res_mods_dir}</span>
              </div>
            </div>
          )}

          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                status.type === 'success'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {status.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <FolderOpen className="h-4 w-4 mr-2" /> 保存配置
            </Button>
            <Button variant="secondary" onClick={handleLaunch}>
              <Play className="h-4 w-4 mr-2" /> 启动游戏
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通用设置</CardTitle>
          <CardDescription>应用通用配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">开机自启</p>
              <p className="text-xs text-muted-foreground">开机时自动启动并常驻托盘</p>
            </div>
            <Badge variant="secondary" className="text-xs">即将推出</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">文件关联</p>
              <p className="text-xs text-muted-foreground">关联 .wotmod 文件格式</p>
            </div>
            <Badge variant="secondary" className="text-xs">即将推出</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
