import { ModInfo, CATEGORY_LABELS } from '../../types';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui';
import { formatFileSize } from '../../lib/utils';
import { X, FileCode, AlertTriangle } from 'lucide-react';

interface ModDetailProps {
  mod: ModInfo;
  onClose: () => void;
}

export function ModDetail({ mod, onClose }: ModDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto mx-4">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{mod.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              v{mod.version} by {mod.author}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">描述</h4>
            <p className="text-sm text-muted-foreground">
              {mod.description || '暂无描述'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">分类</h4>
              <Badge variant="outline" className="mt-1">
                {CATEGORY_LABELS[mod.category]}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">状态</h4>
              <Badge
                variant={mod.enabled ? 'success' : 'secondary'}
                className="mt-1"
              >
                {mod.enabled ? '已启用' : '已禁用'}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">游戏版本</h4>
              <p className="text-sm mt-1">v{mod.game_version}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">文件大小</h4>
              <p className="text-sm mt-1">{formatFileSize(mod.file_size)}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">安装时间</h4>
              <p className="text-sm mt-1">{mod.installed_at}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground">来源</h4>
              <p className="text-sm mt-1 truncate">
                {mod.source ? '本地文件' : '内置包'}
              </p>
            </div>
          </div>

          {mod.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">标签</h4>
              <div className="flex flex-wrap gap-1">
                {mod.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {mod.conflicts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                冲突文件
              </h4>
              <div className="space-y-1 max-h-32 overflow-auto">
                {mod.conflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-destructive/5 rounded text-xs"
                  >
                    <span className="truncate">{conflict.file_path}</span>
                    <Badge variant="outline" className="shrink-0 ml-2">
                      {conflict.resolution}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
              <FileCode className="h-4 w-4" />
              安装文件 ({mod.files.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-auto">
              {mod.files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-xs"
                >
                  <span className="truncate">{file.relative_path}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
