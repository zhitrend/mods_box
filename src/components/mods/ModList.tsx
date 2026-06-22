import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { ModCard } from './ModCard';
import { ModDetail } from './ModDetail';
import { Button, Select, Badge } from '../ui';
import { ModInfo } from '../../types';
import { Package, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export function ModList() {
  const { mods, searchQuery, filterStatus, setFilterStatus, removeMod, updateMod } = useModStore();
  const [selectedMod, setSelectedMod] = useState<ModInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredMods = mods.filter((mod) => {
    const matchesSearch = mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || mod.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleToggle = async (id: string) => {
    try {
      const updated = await invoke<ModInfo>('toggle_mod', { modId: id });
      updateMod(id, updated);
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      await invoke('uninstall_mod', { modId: id });
      removeMod(id);
    } catch (e) {
      console.error('Uninstall failed:', e);
    }
  };

  const handleBatchToggle = async (enable: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const updated = await invoke<ModInfo[]>('batch_toggle_mods', { modIds: ids, enable });
      updated.forEach((m) => updateMod(m.id, m));
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Batch toggle failed:', e);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'Enabled', label: '已启用' },
    { value: 'Disabled', label: '已禁用' },
    { value: 'Conflict', label: '冲突' },
    { value: 'Outdated', label: '过时' },
  ];

  const countByStatus = (status: string) =>
    status === 'all' ? mods.length : mods.filter((m) => m.status === status).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select
            options={filterOptions.map((o) => ({
              ...o,
              label: `${o.label} (${countByStatus(o.value)})`,
            }))}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-40"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              已选 {selectedIds.size} 项
            </span>
            <Button size="sm" variant="outline" onClick={() => handleBatchToggle(true)}>
              <ToggleRight className="h-4 w-4 mr-1" /> 批量启用
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBatchToggle(false)}>
              <ToggleLeft className="h-4 w-4 mr-1" /> 批量禁用
            </Button>
            <Button size="sm" variant="destructive">
              <Trash2 className="h-4 w-4 mr-1" /> 批量卸载
            </Button>
          </div>
        )}
      </div>

      {filteredMods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg">暂无模组</p>
          <p className="text-sm">前往"安装模组"页面添加模组</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredMods.map((mod) => (
            <div key={mod.id} className="relative">
              <input
                type="checkbox"
                checked={selectedIds.has(mod.id)}
                onChange={() => toggleSelect(mod.id)}
                className="absolute top-2 left-2 z-10 h-4 w-4"
              />
              <ModCard
                mod={mod}
                onToggle={handleToggle}
                onUninstall={handleUninstall}
                onDetail={setSelectedMod}
              />
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-muted-foreground border-t pt-3">
        共 {mods.length} 个模组
        {filteredMods.length !== mods.length && ` (筛选后 ${filteredMods.length} 个)`}
      </div>

      {selectedMod && (
        <ModDetail mod={selectedMod} onClose={() => setSelectedMod(null)} />
      )}
    </div>
  );
}
