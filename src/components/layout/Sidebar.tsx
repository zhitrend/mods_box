import { useNavigate, useLocation } from 'react-router-dom';
import { useModStore } from '../../stores/modStore';
import { Layout, Typography } from 'antd';
import {
  AppstoreOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const navItems = [
  { path: '/', label: '模组管理', icon: <AppstoreOutlined /> },
  { path: '/install', label: '安装模组', icon: <DownloadOutlined /> },
  { path: '/backup', label: '备份管理', icon: <DatabaseOutlined /> },
  { path: '/settings', label: '设置', icon: <SettingOutlined /> },
  { path: '/about', label: '关于', icon: <InfoCircleOutlined /> },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, gameConfig, isBound, kamiInfo } = useModStore();

  const selectedKey = navItems.find((item) => item.path === location.pathname)?.path || '/';

  return (
    <Layout.Sider
      trigger={null}
      collapsible
      collapsed={sidebarCollapsed}
      width={224}
      collapsedWidth={64}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      {/* Logo area */}
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--armory-border)',
          gap: 10,
        }}
      >
        <div
          onClick={toggleSidebar}
          style={{
            cursor: 'pointer',
            fontSize: 18,
            padding: 6,
            borderRadius: 6,
            color: 'var(--armory-gold)',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          className="hoverable-icon"
          title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        {!sidebarCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.06em',
                color: 'var(--armory-gold)',
                lineHeight: 1.2,
              }}
            >
              WoT MODS
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 500,
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--armory-text-dim)',
                textTransform: 'uppercase',
              }}
            >
              Manager
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                margin: '2px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 15,
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: isActive ? 'var(--armory-gold)' : 'var(--armory-text-secondary)',
                background: isActive ? 'var(--armory-gold-glow)' : 'transparent',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
              className={isActive ? undefined : 'nav-item'}
              title={item.label}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    background: 'var(--armory-gold)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      <div
        style={{
          borderTop: '1px solid var(--armory-border)',
          padding: '12px 16px',
        }}
      >
        {!sidebarCollapsed && isBound && kamiInfo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              padding: '6px 10px',
              background: 'var(--armory-gold-glow)',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <SafetyCertificateOutlined style={{ color: 'var(--armory-gold)', fontSize: 14 }} />
            <span style={{ color: 'var(--armory-gold)', fontWeight: 600, fontSize: 13, fontFamily: "'Rajdhani', sans-serif" }}>
              VIP
            </span>
            <span style={{ color: 'var(--armory-text-dim)', marginLeft: 'auto', fontSize: 11 }}>
              {kamiInfo.expire_time ? kamiInfo.expire_time.split(' ')[0] : '永久'}
            </span>
          </div>
        )}
        {sidebarCollapsed && isBound && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <SafetyCertificateOutlined style={{ color: 'var(--armory-gold)', fontSize: 16 }} />
          </div>
        )}
        {!sidebarCollapsed && gameConfig && (
          <div style={{ fontSize: 11, color: 'var(--armory-text-dim)', lineHeight: 1.6 }}>
            <div>v{gameConfig.version}</div>
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {gameConfig.region}
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--armory-text-dim)',
            }}
          >
            v{gameConfig?.version || '?'}
          </div>
        )}
      </div>
    </Layout.Sider>
  );
}
