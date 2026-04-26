import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { BrowserProfile, Bookmark, HistoryEntry, generateFingerprint, PROFILE_COLORS, PROFILE_ICONS } from "@/types";

const PROFILES_KEY = "@bpm_profiles_v2";
const ACTIVE_KEY = "@bpm_active_v2";

interface ProfileContextValue {
  profiles: BrowserProfile[];
  activeProfileId: string | null;
  activeProfile: BrowserProfile | null;
  selectedProfiles: string[];
  isLoading: boolean;
  createProfile: (name: string, color?: string) => Promise<BrowserProfile>;
  renameProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
  updateProfile: (id: string, updates: Partial<BrowserProfile>) => Promise<void>;
  addHistoryEntry: (profileId: string, url: string, title: string) => Promise<void>;
  clearHistory: (profileId: string) => Promise<void>;
  addBookmark: (profileId: string, url: string, title: string) => Promise<void>;
  removeBookmark: (profileId: string, bookmarkId: string) => Promise<void>;
  clearProfileData: (profileId: string) => Promise<void>;
  duplicateProfile: (id: string) => Promise<BrowserProfile>;
  toggleSelectProfile: (id: string) => void;
  clearSelection: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [raw, activeId] = await Promise.all([
        AsyncStorage.getItem(PROFILES_KEY),
        AsyncStorage.getItem(ACTIVE_KEY),
      ]);
      if (raw) {
        const parsed: BrowserProfile[] = JSON.parse(raw);
        setProfiles(parsed);
        if (activeId && parsed.find((p) => p.id === activeId)) {
          setActiveId(activeId);
        } else if (parsed.length > 0) {
          setActiveId(parsed[0].id);
        }
      } else {
        const p = makeProfile("Cá nhân", 0);
        setProfiles([p]);
        setActiveId(p.id);
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify([p]));
        await AsyncStorage.setItem(ACTIVE_KEY, p.id);
      }
    } catch (e) {
      console.warn("[ProfileContext] load error", e);
    } finally {
      setIsLoading(false);
    }
  }

  function makeProfile(name: string, idx: number): BrowserProfile {
    return {
      id: uid(),
      name,
      color: PROFILE_COLORS[idx % PROFILE_COLORS.length],
      icon: PROFILE_ICONS[idx % PROFILE_ICONS.length],
      fingerprint: generateFingerprint(),
      isPrivate: false,
      cookiesEnabled: true,
      javascriptEnabled: true,
      historyEntries: [],
      bookmarks: [],
      visitCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      isActive: false,
    };
  }

  async function save(updated: BrowserProfile[]) {
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  }

  const createProfile = useCallback(async (name: string, color?: string): Promise<BrowserProfile> => {
    const p = makeProfile(name, profiles.length);
    if (color) p.color = color;
    await save([...profiles, p]);
    return p;
  }, [profiles]);

  const renameProfile = useCallback(async (id: string, name: string) => {
    await save(profiles.map((p) => p.id === id ? { ...p, name } : p));
  }, [profiles]);

  const deleteProfile = useCallback(async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    await save(updated);
    if (activeProfileId === id) {
      const next = updated[0]?.id ?? null;
      setActiveId(next);
      if (next) await AsyncStorage.setItem(ACTIVE_KEY, next);
      else await AsyncStorage.removeItem(ACTIVE_KEY);
    }
  }, [profiles, activeProfileId]);

  const setActiveProfile = useCallback(async (id: string) => {
    setActiveId(id);
    await AsyncStorage.setItem(ACTIVE_KEY, id);
    await save(profiles.map((p) => ({ ...p, isActive: p.id === id, lastUsed: p.id === id ? Date.now() : p.lastUsed })));
  }, [profiles]);

  const updateProfile = useCallback(async (id: string, updates: Partial<BrowserProfile>) => {
    await save(profiles.map((p) => p.id === id ? { ...p, ...updates } : p));
  }, [profiles]);

  const addHistoryEntry = useCallback(async (profileId: string, url: string, title: string) => {
    const entry: HistoryEntry = { id: uid(), url, title, visitedAt: Date.now() };
    await save(profiles.map((p) => {
      if (p.id !== profileId) return p;
      return { ...p, historyEntries: [entry, ...p.historyEntries].slice(0, 200), visitCount: p.visitCount + 1 };
    }));
  }, [profiles]);

  const clearHistory = useCallback(async (profileId: string) => {
    await save(profiles.map((p) => p.id === profileId ? { ...p, historyEntries: [] } : p));
  }, [profiles]);

  const addBookmark = useCallback(async (profileId: string, url: string, title: string) => {
    const bm: Bookmark = { id: uid(), url, title, createdAt: Date.now() };
    await save(profiles.map((p) => {
      if (p.id !== profileId) return p;
      if (p.bookmarks.find((b) => b.url === url)) return p;
      return { ...p, bookmarks: [bm, ...p.bookmarks] };
    }));
  }, [profiles]);

  const removeBookmark = useCallback(async (profileId: string, bookmarkId: string) => {
    await save(profiles.map((p) =>
      p.id === profileId ? { ...p, bookmarks: p.bookmarks.filter((b) => b.id !== bookmarkId) } : p
    ));
  }, [profiles]);

  const clearProfileData = useCallback(async (profileId: string) => {
    await save(profiles.map((p) =>
      p.id === profileId ? { ...p, historyEntries: [], bookmarks: [], visitCount: 0 } : p
    ));
  }, [profiles]);

  const duplicateProfile = useCallback(async (id: string): Promise<BrowserProfile> => {
    const src = profiles.find((p) => p.id === id);
    if (!src) throw new Error("Profile not found");
    const dup: BrowserProfile = {
      ...src,
      id: uid(),
      name: `${src.name} (bản sao)`,
      fingerprint: generateFingerprint(),
      historyEntries: [],
      visitCount: 0,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: false,
    };
    await save([...profiles, dup]);
    return dup;
  }, [profiles]);

  const toggleSelectProfile = useCallback((id: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedProfiles([]), []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  return (
    <ProfileContext.Provider value={{
      profiles, activeProfileId, activeProfile, selectedProfiles, isLoading,
      createProfile, renameProfile, deleteProfile, setActiveProfile, updateProfile,
      addHistoryEntry, clearHistory, addBookmark, removeBookmark, clearProfileData,
      duplicateProfile, toggleSelectProfile, clearSelection,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within ProfileProvider");
  return ctx;
}
