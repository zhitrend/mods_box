import { Card, CardHeader, CardTitle, CardContent } from '../ui';

export function About() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>关于 WoT Mods Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🎮</div>
            <h2 className="text-xl font-bold">WoT Mods Manager</h2>
            <p className="text-sm text-muted-foreground">v0.1.0</p>
          </div>

          <div className="space-y-2 text-sm">
            <p>坦克世界（World of Tanks）模组管理桌面客户端。</p>
            <p>为坦克世界玩家提供一个轻量、安全、易用的模组管理工具。</p>
          </div>

          <div className="space-y-1 text-sm">
            <h3 className="font-medium">技术栈</h3>
            <p className="text-muted-foreground">
              Rust + Tauri v2 + React + TypeScript + TailwindCSS
            </p>
          </div>

          <div className="space-y-1 text-sm">
            <h3 className="font-medium">功能特性</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>模组安装、启用/禁用、卸载</li>
              <li>冲突检测与解决</li>
              <li>游戏路径自动检测</li>
              <li>备份与恢复</li>
              <li>亮色/暗色主题</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
