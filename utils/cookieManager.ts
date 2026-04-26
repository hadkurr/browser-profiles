import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const COOKIE_PREFIX = "__bpm_cookies_";

export interface SavedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export type CookieVault = Record<string, SavedCookie[]>;

function getNativeMgr(): any | null {
  if (Platform.OS !== "android") return null;
  return (
    NativeModules.ProfileCookieManager ??
    NativeModules.RNCCookieManagerAndroid ??
    null
  );
}

export function isCookieIsolationAvailable(): boolean {
  return getNativeMgr() !== null;
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function saveProfileCookies(
  profileId: string,
  url: string
): Promise<void> {
  const mgr = getNativeMgr();
  if (!mgr) return;
  try {
    const cookies = await mgr.get(url, false);
    if (!cookies) return;
    const domain = extractDomain(url);
    const list: SavedCookie[] = Object.values(cookies).map((c: any) => ({
      name: c.name,
      value: c.value,
      domain: c.domain ?? domain,
      path: c.path ?? "/",
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
    }));
    if (list.length > 0) {
      const raw = await AsyncStorage.getItem(COOKIE_PREFIX + profileId);
      const vault: CookieVault = raw ? JSON.parse(raw) : {};
      vault[domain] = list;
      await AsyncStorage.setItem(
        COOKIE_PREFIX + profileId,
        JSON.stringify(vault)
      );
    }
  } catch (e) {
    console.warn("[CookieMgr] save error", e);
  }
}

export async function restoreProfileCookies(profileId: string): Promise<void> {
  const mgr = getNativeMgr();
  if (!mgr) return;
  try {
    await new Promise<void>((res) =>
      mgr.clearAll ? mgr.clearAll(false, () => res(), () => res()) : res()
    );
    const raw = await AsyncStorage.getItem(COOKIE_PREFIX + profileId);
    if (!raw) return;
    const vault: CookieVault = JSON.parse(raw);
    for (const [domain, cookies] of Object.entries(vault)) {
      const url = `https://${domain}`;
      for (const c of cookies) {
        try {
          await mgr.set(url, {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path ?? "/",
            expires: c.expires,
            httpOnly: c.httpOnly ?? false,
            secure: c.secure ?? false,
          });
        } catch {}
      }
    }
  } catch (e) {
    console.warn("[CookieMgr] restore error", e);
  }
}

export async function clearProfileCookies(profileId: string): Promise<void> {
  await AsyncStorage.removeItem(COOKIE_PREFIX + profileId);
}
