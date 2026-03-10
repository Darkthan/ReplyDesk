import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AppSettings {
  appName: string;
  logoUrl: string | null;
}

interface AppSettingsContextType extends AppSettings {
  refresh: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  appName: 'EmailAuto',
  logoUrl: null,
  refresh: async () => {},
});

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({ appName: 'EmailAuto', logoUrl: null });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/app-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          appName: data.app_name || 'EmailAuto',
          logoUrl: data.app_logo || null,
        });
      }
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppSettingsContext.Provider value={{ ...settings, refresh: load }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
