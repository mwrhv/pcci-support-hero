import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Smartphone } from 'lucide-react';
import { isNative, getAppInfo } from '@/lib/capacitor-native';

export const NativeStatusBadge = () => {
  const [appInfo, setAppInfo] = useState<any>(null);

  useEffect(() => {
    const loadAppInfo = async () => {
      if (isNative()) {
        const info = await getAppInfo();
        setAppInfo(info);
      }
    };
    loadAppInfo();
  }, []);

  if (!isNative()) {
    return null;
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <Smartphone className="h-3 w-3" />
      <span>App Mobile</span>
      {appInfo && <span className="text-xs opacity-70">v{appInfo.version}</span>}
    </Badge>
  );
};