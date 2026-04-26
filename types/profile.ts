export interface Fingerprint {
  userAgent: string;
  platform: "Win32" | "MacIntel" | "Linux x86_64";
  language: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  webglVendor: string;
  webglRenderer: string;
  canvasNoise: boolean;
  timezone: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: number;
}

export interface BrowserProfile {
  id: string;
  name: string;
  color: string;
  icon: string;
  fingerprint: Fingerprint;
  isPrivate: boolean;
  cookiesEnabled: boolean;
  javascriptEnabled: boolean;
  proxyHost?: string;
  proxyPort?: number;
  notes?: string;
  historyEntries: HistoryEntry[];
  bookmarks: Bookmark[];
  visitCount: number;
  lastUsed: number;
  createdAt: number;
  isActive: boolean;
}

export type ProfileStatus = "idle" | "loading" | "running" | "error";

export interface MultiSession {
  profileId: string;
  url: string;
  status: ProfileStatus;
  title?: string;
  lastActivity?: number;
}

export const PROFILE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
];

export const PROFILE_ICONS = [
  "person",
  "briefcase",
  "shield",
  "star",
  "heart",
  "flash",
  "rocket",
  "globe",
  "lock-closed",
  "eye",
];

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
];

const WEBGL_VENDORS = ["Google Inc. (NVIDIA)", "Google Inc. (AMD)", "Intel Inc.", "Apple"];
const WEBGL_RENDERERS = [
  "ANGLE (NVIDIA GeForce RTX 3060)",
  "ANGLE (AMD Radeon RX 6700 XT)",
  "Intel Iris Xe Graphics",
  "Apple M2",
];
const LANGUAGES = ["en-US", "vi-VN", "zh-CN", "ja-JP", "ko-KR", "fr-FR", "de-DE"];
const PLATFORMS: Fingerprint["platform"][] = ["Win32", "MacIntel", "Linux x86_64"];
const TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
  "America/Los_Angeles",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateFingerprint(): Fingerprint {
  const platform = pick(PLATFORMS);
  const screenOpts = [
    [1920, 1080],
    [2560, 1440],
    [1440, 900],
    [1366, 768],
  ];
  const [sw, sh] = pick(screenOpts);
  return {
    userAgent: pick(UA_POOL),
    platform,
    language: pick(LANGUAGES),
    screenWidth: sw,
    screenHeight: sh,
    colorDepth: pick([24, 30, 32]),
    webglVendor: pick(WEBGL_VENDORS),
    webglRenderer: pick(WEBGL_RENDERERS),
    canvasNoise: Math.random() > 0.3,
    timezone: pick(TIMEZONES),
  };
}
