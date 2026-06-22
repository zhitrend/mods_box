import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useModStore } from '../../stores/modStore';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Input, Badge } from '../ui';

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
  const { setIsBound, setKamiInfo, setVipStatus } = useModStore();
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
        // not bound, show login form
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (boundInfo) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>已绑定</CardTitle>
            <CardDescription>正在进入应用...</CardDescription>
          </CardHeader>
          {boundInfo.expire_time && (
            <CardContent className="text-center text-sm text-muted-foreground">
              VIP 有效期至: {boundInfo.expire_time}
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">WoT Mods Manager</CardTitle>
          <CardDescription>请输入卡密以绑定设备</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="请输入卡密"
              value={kami}
              onChange={(e) => setKami(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBind()}
              className="pl-10"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button className="w-full" onClick={handleBind} disabled={loading || !kami.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                绑定中...
              </>
            ) : (
              '绑定'
            )}
          </Button>
        </CardContent>
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <Badge variant="outline">安全加密连接</Badge>
          <span>v1.0.0</span>
        </CardFooter>
      </Card>
    </div>
  );
}
