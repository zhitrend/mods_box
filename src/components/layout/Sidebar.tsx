import { useNavigate, useLocation } from 'react-router-dom';
import { useModStore } from '../../stores/modStore';
import { cn } from '../../lib/utils';
import { Shield } from 'lucide-react';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, gameConfig, isBound, kamiInfo } = useModStore();

  const navItems = [
    { path: '/', label: '模组管理', icon: '📦' },
    { path: '/install', label: '安装模组', icon: '📥' },
    { path: '/backup', label: '备份管理', icon: '💾' },
    { path: '/settings', label: '设置', icon: '⚙️' },
    { path: '/about', label: '关于', icon: 'ℹ️' },
  ];

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <button
          onClick={toggleSidebar}
          className="text-lg hover:bg-accent rounded-md p-1"
          title="切换侧边栏"
        >
          {sidebarCollapsed ? '☰' : '✕'}
        </button>
        {!sidebarCollapsed && (
          <span className="ml-3 font-semibold text-sm truncate">WoT Mods Manager</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
              location.pathname === item.path
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground'
            )}
            title={item.label}
          >
            <span className="text-lg">{item.icon}</span>
            {!sidebarCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t p-3 space-y-2">
        {!sidebarCollapsed && isBound && kamiInfo && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
            <Shield className="h-3 w-3 text-primary shrink-0" />
            <span className="text-primary font-medium">VIP</span>
            <span className="text-muted-foreground ml-auto">
              {kamiInfo.expire_time ? kamiInfo.expire_time.split(' ')[0] : '永久'}
            </span>
          </div>
        )}
        {sidebarCollapsed && isBound && (
          <div className="flex justify-center" title="VIP 会员">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        )}
        {!sidebarCollapsed && gameConfig && (
          <div className="text-xs text-muted-foreground truncate">
            <div>游戏: v{gameConfig.version}</div>
            <div className="truncate">{gameConfig.region}</div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="text-center text-xs text-muted-foreground" title="游戏版本">
            v{gameConfig?.version || '?'}
          </div>
        )}
      </div>
    </aside>
  );
}
