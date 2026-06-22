import { ModInfo, CATEGORY_LABELS } from '../../types';
import { Card, CardContent, Badge, Switch, Button } from '../ui';
import { formatFileSize } from '../../lib/utils';
import { Trash2, Info, AlertTriangle } from 'lucide-react';

interface ModCardProps {
  mod: ModInfo;
  onToggle: (id: string) => void;
  onUninstall: (id: string) => void;
  onDetail: (mod: ModInfo) => void;
}

export function ModCard({ mod, onToggle, onUninstall, onDetail }: ModCardProps) {
  const statusColors: Record<string, 'success' | 'warning' | 'destructive' | 'secondary' | 'default'> = {
    Enabled: 'success',
    Disabled: 'secondary',
    Conflict: 'destructive',
    Outdated: 'warning',
    Incompatible: 'destructive',
    Error: 'destructive',
  };

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium truncate">{mod.name}</h3>
              {mod.status === 'Conflict' && (
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              v{mod.version} · {mod.author}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={statusColors[mod.status] || 'default'}>
                {mod.status === 'Enabled' ? '已启用' :
                 mod.status === 'Disabled' ? '已禁用' :
                 mod.status === 'Conflict' ? '冲突' :
                 mod.status === 'Outdated' ? '过时' : mod.status}
              </Badge>
              <Badge variant="outline">{CATEGORY_LABELS[mod.category]}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(mod.file_size)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Switch
              checked={mod.enabled}
              onCheckedChange={() => onToggle(mod.id)}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDetail(mod)}
              title="详情"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onUninstall(mod.id)}
              title="卸载"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {mod.conflicts.length > 0 && (
          <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
            与 {mod.conflicts.length} 个文件存在冲突
          </div>
        )}
      </CardContent>
    </Card>
  );
}
