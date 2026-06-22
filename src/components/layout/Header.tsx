import { useModStore } from '../../stores/modStore';
import { Input, Button } from 'antd';
import { SearchOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';

export function Header() {
  const { searchQuery, setSearchQuery, darkMode, toggleDarkMode } = useModStore();

  return (
    <div
      style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        borderBottom: '1px solid var(--armory-border)',
        background: 'var(--armory-surface)',
      }}
    >
      <div style={{ flex: 1, maxWidth: 420 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--armory-text-dim)' }} />}
          placeholder="搜索模组..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          variant="borderless"
          style={{
            background: 'var(--armory-bg)',
            borderRadius: 6,
            height: 36,
          }}
        />
      </div>

      <Button
        type="text"
        icon={
          darkMode
            ? <SunOutlined style={{ color: 'var(--armory-gold)' }} />
            : <MoonOutlined style={{ color: 'var(--armory-text-secondary)' }} />
        }
        onClick={toggleDarkMode}
        aria-label="切换主题"
        style={{ fontSize: 16 }}
      />
    </div>
  );
}
