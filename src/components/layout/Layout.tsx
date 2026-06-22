import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Layout as AntLayout } from 'antd';

export function Layout() {
  return (
    <AntLayout style={{ height: '100vh', background: 'var(--color-background)' }}>
      <Sidebar />
      <AntLayout>
        <Header />
        <AntLayout.Content style={{ overflow: 'auto', padding: 24 }}>
          <Outlet />
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  );
}
