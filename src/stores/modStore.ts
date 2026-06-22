import { create } from 'zustand';
import { ModInfo, GameConfig, BackupInfo } from '../types';

interface ModStore {
  mods: ModInfo[];
  gameConfig: GameConfig | null;
  backups: BackupInfo[];
  isLoading: boolean;
  searchQuery: string;
  filterStatus: string;
  sidebarCollapsed: boolean;

  isBound: boolean;
  kamiInfo: { kami: string; expire_time: string | null; expire_ts: number | null } | null;
  vipStatus: string;

  setMods: (mods: ModInfo[]) => void;
  addMod: (mod: ModInfo) => void;
  updateMod: (id: string, mod: Partial<ModInfo>) => void;
  removeMod: (id: string) => void;
  setGameConfig: (config: GameConfig | null) => void;
  setBackups: (backups: BackupInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  toggleSidebar: () => void;
  setIsBound: (bound: boolean) => void;
  setKamiInfo: (info: any) => void;
  setVipStatus: (status: string) => void;
}

export const useModStore = create<ModStore>((set) => ({
  mods: [],
  gameConfig: null,
  backups: [],
  isLoading: false,
  searchQuery: '',
  filterStatus: 'all',
  sidebarCollapsed: false,
  isBound: false,
  kamiInfo: null,
  vipStatus: '',

  setMods: (mods) => set({ mods }),
  addMod: (mod) => set((state) => ({ mods: [...state.mods, mod] })),
  updateMod: (id, updates) =>
    set((state) => ({
      mods: state.mods.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMod: (id) =>
    set((state) => ({ mods: state.mods.filter((m) => m.id !== id) })),
  setGameConfig: (config) => set({ gameConfig: config }),
  setBackups: (backups) => set({ backups }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setIsBound: (bound) => set({ isBound: bound }),
  setKamiInfo: (info) => set({ kamiInfo: info }),
  setVipStatus: (status) => set({ vipStatus: status }),
}));
