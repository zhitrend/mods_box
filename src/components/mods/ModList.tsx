import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModStore } from '../../stores/modStore';
import { ModCard } from './ModCard';
import { ModDetail } from './ModDetail';
import { Select, Button, Space, Typography, Checkbox, Row, Col, Empty } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { ModInfo } from '../../types';

const { Text } = Typography;

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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={filterOptions.map((o) => ({
            value: o.value,
            label: `${o.label} (${countByStatus(o.value)})`,
          }))}
          style={{ width: 160 }}
        />

        {selectedIds.size > 0 && (
          <Space>
            <Text type="secondary">已选 {selectedIds.size} 项</Text>
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => handleBatchToggle(true)}>
              批量启用
            </Button>
            <Button size="small" icon={<CloseCircleOutlined />} onClick={() => handleBatchToggle(false)}>
              批量禁用
            </Button>
          </Space>
        )}
      </div>

      {filteredMods.length === 0 ? (
        <Empty description="暂无模组" style={{ padding: 64 }}>
          <Text type="secondary">前往"安装模组"页面添加模组</Text>
        </Empty>
      ) : (
        <Row gutter={[12, 12]}>
          {filteredMods.map((mod) => (
            <Col key={mod.id} xs={24} sm={12} xl={8}>
              <div style={{ position: 'relative' }}>
                <Checkbox
                  checked={selectedIds.has(mod.id)}
                  onChange={() => toggleSelect(mod.id)}
                  style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}
                />
                <ModCard
                  mod={mod}
                  onToggle={handleToggle}
                  onUninstall={handleUninstall}
                  onDetail={setSelectedMod}
                />
              </div>
            </Col>
          ))}
        </Row>
      )}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(128,128,128,0.15)', fontSize: 13, color: 'rgba(128,128,128,0.65)' }}>
        共 {mods.length} 个模组
        {filteredMods.length !== mods.length && ` (筛选后 ${filteredMods.length} 个)`}
      </div>

      {selectedMod && (
        <ModDetail mod={selectedMod} onClose={() => setSelectedMod(null)} />
      )}
    </div>
  );
}
