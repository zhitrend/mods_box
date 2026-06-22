import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Input, Button, Alert, Spin, Tag } from 'antd';
import {
  SafetyCertificateOutlined,
  KeyOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useModStore } from '../../stores/modStore';

interface KamiInfo {
  kami: string;
  expire_time: string | null;
  expire_ts: number | null;
  last_check_time: number | null;
}

interface LoginPageProps {
  onBound: () => void;
}

export function LoginPage({ onBound }: LoginPageProps) {
  const { setIsBound, setKamiInfo } = useModStore();
  const [kami, setKami] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [boundInfo, setBoundInfo] = useState<{ expire_time: string | null; expire_ts: number | null } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const status = await invoke<string>('check_auth_status');
        if (status.startsWith('bound:')) {
          const info = await invoke<KamiInfo | null>('load_kami_info_cmd');
          if (info) {
            setIsBound(true);
            setKamiInfo(info);
            setBoundInfo({ expire_time: info.expire_time, expire_ts: info.expire_ts });
          }
        }
      } catch {
        // not bound
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (boundInfo) {
      const timer = setTimeout(() => onBound(), 1500);
      return () => clearTimeout(timer);
    }
  }, [boundInfo]);

  async function handleBind() {
    if (!kami.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await invoke<KamiInfo>('bind_kami', { kami: kami.trim() });
      setIsBound(true);
      setKamiInfo(data);
      onBound();
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e?.message || '绑定失败，请检查卡密');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--armory-bg)',
        }}
      >
        <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: 'var(--armory-gold)' }} />} />
      </div>
    );
  }

  if (boundInfo) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--armory-bg)',
        }}
      >
        <div
          style={{
            background: 'var(--armory-elevated)',
            border: '1px solid var(--armory-border)',
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            maxWidth: 400,
            width: '100%',
            margin: '0 16px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(82, 196, 26, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}
          >
            已绑定
          </div>
          <div style={{ color: 'var(--armory-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            正在进入应用…
          </div>
          {boundInfo.expire_time && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: 'var(--armory-text-dim)',
              }}
            >
              VIP 有效期至: {boundInfo.expire_time}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--armory-bg)',
        position: 'relative',
      }}
    >
      {/* Decorative corner elements */}
      <div aria-hidden="true"
        style={{
          position: 'absolute',
          top: 40,
          left: 40,
          width: 60,
          height: 60,
          borderTop: '2px solid var(--armory-gold-dim)',
          borderLeft: '2px solid var(--armory-gold-dim)',
          opacity: 0.3,
        }}
      />
      <div aria-hidden="true"
        style={{
          position: 'absolute',
          top: 40,
          right: 40,
          width: 60,
          height: 60,
          borderTop: '2px solid var(--armory-gold-dim)',
          borderRight: '2px solid var(--armory-gold-dim)',
          opacity: 0.3,
        }}
      />
      <div aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          width: 60,
          height: 60,
          borderBottom: '2px solid var(--armory-gold-dim)',
          borderLeft: '2px solid var(--armory-gold-dim)',
          opacity: 0.3,
        }}
      />
      <div aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          width: 60,
          height: 60,
          borderBottom: '2px solid var(--armory-gold-dim)',
          borderRight: '2px solid var(--armory-gold-dim)',
          opacity: 0.3,
        }}
      />

      <div
        style={{
          background: 'var(--armory-elevated)',
          border: '1px solid var(--armory-border)',
          borderRadius: 12,
          padding: 48,
          maxWidth: 420,
          width: '100%',
          margin: '0 16px',
          position: 'relative',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 2,
            background: 'linear-gradient(90deg, transparent, var(--armory-gold), transparent)',
            borderRadius: '0 0 2px 2px',
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--armory-gold-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <SafetyCertificateOutlined style={{ fontSize: 36, color: 'var(--armory-gold)' }} aria-hidden="true" />
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '0.06em',
              color: 'var(--armory-gold)',
              marginBottom: 4,
            }}
          >
            WoT MODS MANAGER
          </div>
          <div style={{ color: 'var(--armory-text-secondary)', fontSize: 14 }}>
            军械库 · 安全终端
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <Input
              prefix={<KeyOutlined style={{ color: 'var(--armory-text-dim)' }} />}
              placeholder="请输入卡密"
              value={kami}
              onChange={(e) => setKami(e.target.value)}
              onPressEnter={handleBind}
              size="large"
              disabled={loading}
              name="kami"
              autoComplete="off"
              spellCheck={false}
              style={{ height: 44, paddingLeft: 40 }}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <Alert message={error} type="error" showIcon style={{ borderRadius: 6 }} />
          </div>
        )}

        <Button
          type="primary"
          size="large"
          block
          onClick={handleBind}
          disabled={loading || !kami.trim()}
          loading={loading}
          style={{ height: 44, fontSize: 16, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: '0.06em' }}
        >
          绑定
        </Button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 20,
            fontSize: 11,
            color: 'var(--armory-text-dim)',
          }}
        >
          <Tag
            style={{
              background: 'transparent',
              border: '1px solid var(--armory-border)',
              color: 'var(--armory-text-dim)',
              fontSize: 11,
              letterSpacing: '0.04em',
            }}
          >
            ● 加密连接
          </Tag>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
