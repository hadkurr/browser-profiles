import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CompatWebView, { WebViewRef } from "@/components/CompatWebView";
import C from "@/constants/colors";
import { useProfiles } from "@/context/ProfileContext";
import { buildFingerprintJS } from "@/hooks/useFingerprintJS";
import { useProfileSession } from "@/hooks/useProfileSession";

const PENDING_SCRIPT_KEY = "@bpm_pending_script";

const HOME_URL = "https://www.google.com";

export default function BrowserScreen() {
  const { id, autoScript } = useLocalSearchParams<{ id: string; autoScript?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles, addHistoryEntry, addBookmark } = useProfiles();

  const profile = profiles.find((p) => p.id === id);
  const session = useProfileSession(id ?? "");
  const wvRef = useRef<WebViewRef>(null);

  const [urlInput, setUrlInput] = useState(HOME_URL);
  const [currentUrl, setCurrentUrl] = useState(HOME_URL);
  const [pageTitle, setPageTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [scriptInjected, setScriptInjected] = useState(false);
  const pendingScriptRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoScript === "1") {
      AsyncStorage.getItem(PENDING_SCRIPT_KEY).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as { code: string; profileIds: string[]; timestamp: number };
          if (Date.now() - parsed.timestamp < 60000 && parsed.profileIds.includes(id ?? "")) {
            pendingScriptRef.current = parsed.code;
          }
        } catch {}
      });
    }
  }, [autoScript, id]);

  function normalize(raw: string): string {
    const s = raw.trim();
    if (!s) return HOME_URL;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.includes(".") && !s.includes(" ")) return `https://${s}`;
    return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
  }

  function handleSubmit() {
    const url = normalize(urlInput);
    setCurrentUrl(url);
    setShowUrlBar(false);
    Keyboard.dismiss();
  }

  const handleNavigationChange = useCallback(
    (navState: { url: string; title?: string; canGoBack?: boolean; canGoForward?: boolean }) => {
      const url = navState.url;
      if (!url || url === "about:blank") return;
      setCurrentUrl(url);
      setUrlInput(url);
      setCanGoBack(navState.canGoBack ?? false);
      setCanGoForward(navState.canGoForward ?? false);
      if (navState.title) setPageTitle(navState.title);
      const bookmarked = profile?.bookmarks.some((b) => b.url === url) ?? false;
      setIsBookmarked(bookmarked);
      if (!profile?.isPrivate) {
        addHistoryEntry(id!, url, navState.title ?? url);
      }
    },
    [profile, id, addHistoryEntry]
  );

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.__bpm) session.applyMessage(data);
      } catch {
        // non-JSON message, ignore
      }
    },
    [session]
  );

  async function handleBookmark() {
    if (!currentUrl || !profile) return;
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isBookmarked) {
      await addBookmark(id!, currentUrl, pageTitle || currentUrl);
      setIsBookmarked(true);
    }
  }

  if (!profile) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <Text style={s.errorText}>Không tìm thấy profile</Text>
      </View>
    );
  }

  if (!session.ready) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[s.errorText, { marginTop: 12 }]}>Đang tải phiên...</Text>
      </View>
    );
  }

  const injected = [
    session.buildInjectJS(),
    buildFingerprintJS(profile.fingerprint),
  ].join("\n");

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={[s.toolbar, { borderBottomColor: profile.color + "30" }]}>
        <Pressable style={s.toolBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={18} color={C.textDim} />
        </Pressable>

        <Pressable style={s.toolBtn} onPress={() => wvRef.current?.goBack()} disabled={!canGoBack} hitSlop={8}>
          <Feather name="arrow-left" size={18} color={canGoBack ? C.text : C.textMuted} />
        </Pressable>
        <Pressable style={s.toolBtn} onPress={() => wvRef.current?.goForward()} disabled={!canGoForward} hitSlop={8}>
          <Feather name="arrow-right" size={18} color={canGoForward ? C.text : C.textMuted} />
        </Pressable>

        <Pressable
          style={s.urlBar}
          onPress={() => {
            setShowUrlBar(true);
            setUrlInput(currentUrl);
          }}
        >
          <View style={[s.urlDot, { backgroundColor: profile.color }]} />
          <Text style={s.urlText} numberOfLines={1}>
            {pageTitle || currentUrl}
          </Text>
        </Pressable>

        <Pressable style={s.toolBtn} onPress={handleBookmark} hitSlop={8}>
          <Feather name={isBookmarked ? "bookmark" : "bookmark"} size={17} color={isBookmarked ? C.warning : C.textMuted} />
        </Pressable>
        <Pressable style={s.toolBtn} onPress={() => wvRef.current?.reload()} hitSlop={8}>
          <Feather name={isLoading ? "x" : "refresh-cw"} size={16} color={C.textDim} />
        </Pressable>
      </View>

      {progress > 0 && progress < 1 && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: profile.color }]} />
        </View>
      )}

      {showUrlBar && (
        <View style={s.urlInputOverlay}>
          <View style={s.urlInputRow}>
            <TextInput
              style={s.urlInput}
              value={urlInput}
              onChangeText={setUrlInput}
              autoFocus
              selectTextOnFocus
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              onBlur={() => setShowUrlBar(false)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="Nhập URL hoặc tìm kiếm..."
              placeholderTextColor={C.textMuted}
            />
            <Pressable style={s.goBtn} onPress={handleSubmit}>
              <Feather name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      <View style={s.webContainer}>
        <CompatWebView
          ref={wvRef}
          uri={currentUrl}
          userAgent={profile.fingerprint.userAgent}
          injectedJavaScriptBeforeContentLoaded={injected}
          javaScriptEnabled={profile.javascriptEnabled}
          domStorageEnabled={true}
          sharedCookiesEnabled={profile.cookiesEnabled}
          thirdPartyCookiesEnabled={profile.cookiesEnabled}
          cacheEnabled={true}
          onLoadStart={() => { setIsLoading(true); setProgress(0.1); }}
          onLoadEnd={() => {
            setIsLoading(false);
            setProgress(1);
            setTimeout(() => setProgress(0), 300);
            if (pendingScriptRef.current && !scriptInjected) {
              setScriptInjected(true);
              const script = pendingScriptRef.current;
              pendingScriptRef.current = null;
              setTimeout(() => {
                wvRef.current?.injectJavaScript?.(
                  `(function(){try{${script}}catch(e){console.error('[BPM Script]',e.message);}})(); true;`
                );
                if (Platform.OS === "android") {
                  ToastAndroid.show("✓ Script đã inject", ToastAndroid.SHORT);
                }
              }, 300);
            }
          }}
          onProgress={setProgress}
          onNavigationStateChange={handleNavigationChange}
          onMessage={handleMessage}
          style={s.webView}
        />
        {isLoading && (
          <View style={s.loadingOverlay}>
            <View style={[s.loadingBadge, { backgroundColor: profile.color }]}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.loadingText}>Đang tải...</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[s.statusBar, { paddingBottom: insets.bottom + 4 }]}>
        <View style={[s.profileTag, { backgroundColor: profile.color + "20" }]}>
          <View style={[s.profileDot, { backgroundColor: profile.color }]} />
          <Text style={[s.profileTagText, { color: profile.color }]}>{profile.name}</Text>
          {profile.isPrivate && <Feather name="eye-off" size={10} color={profile.color} />}
        </View>
        <Text style={s.statusUrl} numberOfLines={1}>{currentUrl}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.textMuted },

  toolbar: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, paddingHorizontal: 8, paddingVertical: 8, gap: 6, borderBottomWidth: 1 },
  toolBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  urlBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: C.border },
  urlDot: { width: 7, height: 7, borderRadius: 4 },
  urlText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textDim },

  progressBar: { height: 2, backgroundColor: C.border },
  progressFill: { height: 2 },

  urlInputOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.8)", paddingTop: 60, paddingHorizontal: 16 },
  urlInputRow: { flexDirection: "row", gap: 8, backgroundColor: C.bgCard, borderRadius: C.radiusLg, padding: 10, borderWidth: 1, borderColor: C.primary + "60" },
  urlInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text },
  goBtn: { backgroundColor: C.primary, width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  webContainer: { flex: 1, position: "relative" },
  webView: { flex: 1 },
  loadingOverlay: { position: "absolute", top: 12, right: 12, zIndex: 10 },
  loadingBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  loadingText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#fff" },

  statusBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, paddingHorizontal: 12, paddingTop: 6, gap: 8, borderTopWidth: 1, borderTopColor: C.border },
  profileTag: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  profileDot: { width: 6, height: 6, borderRadius: 3 },
  profileTagText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  statusUrl: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
});
