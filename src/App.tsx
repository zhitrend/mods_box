import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
