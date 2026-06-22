import { useModStore } from '../../stores/modStore';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export function Header() {
  const { searchQuery, setSearchQuery } = useModStore();

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
          placeholder="搜索模组…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          variant="borderless"
          name="search"
          autoComplete="off"
          spellCheck={false}
          style={{
            background: 'var(--armory-bg)',
            borderRadius: 6,
            height: 36,
          }}
        />
      </div>
    </div>
  );
}
