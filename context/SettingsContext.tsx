import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const SETTINGS_KEY = "@bpm_settings_v1";

interface AppSettings {
  fingerprintEnabled: boolean;
  storageIsolationEnabled: boolean;
}

const DEFAULT: AppSettings = {
  fingerprintEnabled: true,
  storageIsolationEnabled: true,
};

interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, setSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

const DEFAULT_VALUE: SettingsContextValue = {
  settings: DEFAULT,
  isLoading: false,
  setSetting: async () => {},
};

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  return ctx ?? DEFAULT_VALUE;
}
