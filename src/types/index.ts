export type ModStatus = 'Enabled' | 'Disabled' | 'Conflict' | 'Outdated' | 'Incompatible' | 'Error';

export type ModCategory = 'Aiming' | 'Crosshair' | 'DamagePanel' | 'Garage' | 'Minimap' | 'Sound' | 'Visual' | 'Utility' | 'XVM' | 'Other';

export type GameRegion = 'EU' | 'NA' | 'ASIA' | 'RU' | 'CN';

export type ConflictResolution = 'Pending' | 'Merged' | 'Overwritten' | 'Skipped' | 'Renamed' | 'Isolated';

export type ConflictGrade = 'High' | 'Medium' | 'Low';

export interface ModFile {
  relative_path: string;
  hash: string;
  size: number;
}

export interface ConflictInfo {
  file_path: string;
  conflict_with: string[];
  resolution: ConflictResolution;
  grade: ConflictGrade;
}

export interface ModInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: ModCategory;
  status: ModStatus;
  installed_at: string;
  install_path: string;
  file_size: number;
  game_version: string;
  files: ModFile[];
  conflicts: ConflictInfo[];
  dependencies: string[];
  tags: string[];
  source: string | null;
  enabled: boolean;
}

export interface GameConfig {
  install_path: string;
  version: string;
  region: GameRegion;
  mods_dir: string;
  res_mods_dir: string;
  auto_detect: boolean;
}

export interface BackupInfo {
  id: string;
  name: string;
  created_at: string;
  description: string;
  mod_list: string[];
  size: number;
  path: string;
}

export const CATEGORY_LABELS: Record<ModCategory, string> = {
  Aiming: '瞄准',
  Crosshair: '准星',
  DamagePanel: '伤害面板',
  Garage: '车库',
  Minimap: '小地图',
  Sound: '音效',
  Visual: '视觉',
  Utility: '实用工具',
  XVM: 'XVM',
  Other: '其他',
};

export const STATUS_LABELS: Record<ModStatus, string> = {
  Enabled: '已启用',
  Disabled: '已禁用',
  Conflict: '冲突',
  Outdated: '已过时',
  Incompatible: '不兼容',
  Error: '错误',
};

export const REGION_LABELS: Record<GameRegion, string> = {
  EU: '欧洲',
  NA: '北美',
  ASIA: '亚洲',
  RU: '俄罗斯',
  CN: '国服',
};
