import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { Layout } from './components/layout/Layout';
import { ModList } from './components/mods/ModList';
import { ModInstall } from './components/mods/ModInstall';
import { BackupManager } from './components/backup/BackupManager';
import { Settings } from './components/settings/Settings';
import { About } from './components/settings/About';
import { LoginPage } from './components/auth/LoginPage';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from './stores/modStore';
import { ModInfo, GameConfig } from './types';

const queryClient = new QueryClient();

const armoryTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#d4af37',
    colorInfo: '#d4af37',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgBase: '#0a0c10',
    colorTextBase: '#eef1f5',
    fontFamily: "'Outfit', 'Rajdhani', sans-serif",
    borderRadius: 8,
    wireframe: false,
  },
  components: {
    Menu: {
      colorItemBg: 'transparent',
      colorItemBgContainer: 'transparent',
      colorItemBgHover: 'rgba(212, 175, 55, 0.1)',
      colorItemBgSelected: 'rgba(212, 175, 55, 0.12)',
      colorItemText: '#9ca3af',
      colorItemTextHover: '#d4af37',
      colorItemTextSelected: '#d4af37',
    },
    Card: {
      colorBgContainer: '#1c212d',
      colorBorderSecondary: '#2d3548',
    },
    Layout: {
      colorBgBody: '#0a0c10',
      colorBgHeader: '#12151c',
      colorBgTrigger: '#1c212d',
    },
    Button: {
      colorPrimary: '#d4af37',
      colorPrimaryHover: '#f1d38a',
      primaryShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
    },
    Input: {
      colorBgContainer: '#12151c',
      colorBorder: '#2d3548',
      colorPrimaryHover: '#d4af37',
    },
    Select: {
      colorBgContainer: '#12151c',
      colorBorder: '#2d3548',
    },
    Switch: {
      colorPrimary: '#d4af37',
    },
    Modal: {
      contentBg: '#1c212d',
      headerBg: 'transparent',
    },
    Message: {
      colorBgElevated: '#1c212d',
    },
    Notification: {
      colorBgElevated: '#1c212d',
    },
  },
};

function AppContent() {
  const { setMods, setGameConfig, isBound, setIsBound, setKamiInfo, setVipStatus } = useModStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const status = await invoke<string>('check_auth_status');
        if (status.startsWith('bound:')) {
          const info = await invoke<any>('load_kami_info_cmd');
          if (info) {
            setIsBound(true);
            setKamiInfo(info);
          }
        }
      } catch {
        // not bound
      } finally {
        setInitializing(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isBound) return;
    async function init() {
      try {
        const mods = await invoke<ModInfo[]>('get_mods');
        setMods(mods);
      } catch (e) {
        console.log('No mods loaded yet:', e);
      }
      try {
        const config = await invoke<GameConfig>('get_game_config');
        if (config.install_path) {
          setGameConfig(config);
        }
      } catch (e) {
        console.log('No game config yet:', e);
      }
      try {
        const outdated = await invoke<ModInfo[]>('check_mod_updates');
        if (outdated.length > 0) {
          outdated.forEach((m) => useModStore.getState().updateMod(m.id, m));
        }
      } catch {
        // not critical
      }
    }
    init();
  }, [isBound]);

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" />
    );
  }

  if (!isBound) {
    return (
      <LoginPage
        onBound={() => {
          setIsBound(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ModList />} />
          <Route path="/install" element={<ModInstall />} />
          <Route path="/backup" element={<BackupManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={armoryTheme}>
        <AppContent />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
