import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CompatWebView, { WebViewRef } from "@/components/CompatWebView";
import C from "@/constants/colors";
import { useProfiles } from "@/context/ProfileContext";
import { buildFingerprintJS } from "@/hooks/useFingerprintJS";
import { useProfileSession } from "@/hooks/useProfileSession";
import {
  isCookieIsolationAvailable,
  restoreProfileCookies,
  saveProfileCookies,
} from "@/utils/cookieManager";
import { BrowserProfile } from "@/types";

const HOME = "https://www.google.com";
const PENDING_SCRIPT_KEY = "@bpm_pending_script";

function normalize(raw: string): string {
  const s = raw.trim();
  if (!s) return HOME;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.includes(".") && !s.includes(" ")) return "https://" + s;
  return "https://www.google.com/search?q=" + encodeURIComponent(s);
}

interface ActiveBrowserProps {
  profile: BrowserProfile;
  url: string;
  pendingScript: string | null;
  onNavigate: (url: string, title: string) => void;
}

function ActiveBrowser({ profile, url, pendingScript, onNavigate }: ActiveBrowserProps) {
  const session = useProfileSession(profile.id);
  const wvRef = useRef<WebViewRef>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const scriptInjectedRef = useRef(false);

  useEffect(() => {
    scriptInjectedRef.current = false;
  }, [profile.id]);

  const injected = [session.buildInjectJS(), buildFingerprintJS(profile.fingerprint)]
    .filter(Boolean)
    .join("\n");

  if (!session.ready) {
    return (
      <View style={ab.center}>
        <ActivityIndicator color={profile.color} size="large" />
        <Text style={ab.hint}>Đang khởi tạo...</Text>
      </View>
    );
  }

  return (
    <View style={ab.root}>
      <CompatWebView
        ref={wvRef}
        uri={currentUrl}
        userAgent={profile.fingerprint.userAgent}
        injectedJavaScriptBeforeContentLoaded={injected}
        javaScriptEnabled={profile.javascriptEnabled}
        domStorageEnabled
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => {
          setIsLoading(false);
          if (pendingScript && !scriptInjectedRef.current) {
            scriptInjectedRef.current = true;
            setTimeout(() => {
              wvRef.current?.injectJavaScript(
                `(function(){try{${pendingScript}}catch(e){}})();true;`
              );
            }, 400);
          }
        }}
        onNavigationStateChange={(nav) => {
          if (!nav.url || nav.url === "about:blank") return;
          setCurrentUrl(nav.url);
          onNavigate(nav.url, nav.title ?? nav.url);
        }}
        style={ab.web}
      />
      {isLoading && (
        <View style={ab.loadingBar}>
          <ActivityIndicator size="small" color={profile.color} />
        </View>
      )}
    </View>
  );
}

const ab = StyleSheet.create({
  root: { flex: 1 },
  web: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hint: { color: C.textMuted, fontFamily: "Inter_400Regular", fontSize: 13 },
  loadingBar: { position: "absolute", top: 0, left: 0, right: 0, padding: 8, alignItems: "flex-end" },
});

export default function MultiTabScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, addHistoryEntry } = useProfiles();

  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [urlInput, setUrlInput] = useState(HOME);
  const [profileUrls, setProfileUrls] = useState<Record<string, string>>({});
  const [switching, setSwitching] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const [scriptBanner, setScriptBanner] = useState("");
  const hasCookieIsolation = isCookieIsolationAvailable();

  const activeProfiles = profiles.filter((p) => activeIds.includes(p.id));
  const currentProfile = activeProfiles[activeIndex] ?? null;
  const currentUrl = (currentProfile && profileUrls[currentProfile.id]) || HOME;

  useEffect(() => {
    AsyncStorage.getItem(PENDING_SCRIPT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { code: string; profileIds: string[]; timestamp: number };
        if (Date.now() - parsed.timestamp < 300000) {
          setPendingScript(parsed.code);
          setScriptBanner("Script sẵn sàng — inject khi trang tiếp theo load");
          if (parsed.profileIds.length > 0) {
            setActiveIds((prev) => {
              const next = [...new Set([...prev, ...parsed.profileIds])];
              return next;
            });
          }
        }
      } catch {}
    });
  }, []);

  const switchToIndex = useCallback(
    async (nextIndex: number) => {
      if (nextIndex === activeIndex || switching) return;
      if (!hasCookieIsolation) {
        setActiveIndex(nextIndex);
        return;
      }
      setSwitching(true);
      try {
        if (currentProfile) {
          await saveProfileCookies(currentProfile.id, currentUrl);
        }
        const nextProfile = activeProfiles[nextIndex];
        if (nextProfile) {
          await restoreProfileCookies(nextProfile.id);
        }
      } catch {}
      setActiveIndex(nextIndex);
      setSwitching(false);
    },
    [activeIndex, switching, hasCookieIsolation, currentProfile, currentUrl, activeProfiles]
  );

  const handleAddProfile = useCallback(async (id: string) => {
    setActiveIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleRemoveProfile = useCallback(
    async (id: string) => {
      const idx = activeIds.indexOf(id);
      setActiveIds((prev) => prev.filter((x) => x !== id));
      if (activeIndex >= activeIds.length - 1 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      } else if (idx < activeIndex) {
        setActiveIndex((i) => Math.max(0, i - 1));
      }
      Haptics.selectionAsync().catch(() => {});
    },
    [activeIds, activeIndex]
  );

  const handleNavigate = useCallback(
    (url: string, title: string) => {
      if (!currentProfile) return;
      setProfileUrls((prev) => ({ ...prev, [currentProfile.id]: url }));
      if (!currentProfile.isPrivate) {
        addHistoryEntry(currentProfile.id, url, title);
      }
      if (hasCookieIsolation) {
        saveProfileCookies(currentProfile.id, url).catch(() => {});
      }
    },
    [currentProfile, hasCookieIsolation, addHistoryEntry]
  );

  function handleSubmit() {
    const url = normalize(urlInput);
    if (currentProfile) {
      setProfileUrls((prev) => ({ ...prev, [currentProfile.id]: url }));
    }
    Keyboard.dismiss();
  }

  const filteredProfiles = pickerSearch
    ? profiles.filter((p) => p.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    : profiles;

  if (activeProfiles.length === 0) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.emptyHeader}>
          <Text style={s.title}>Multi Browser</Text>
        </View>
        <View style={s.emptyBody}>
          <Feather name="grid" size={52} color={C.textMuted} />
          <Text style={s.emptyTitle}>Chưa có profile nào đang mở</Text>
          <Text style={s.emptyDesc}>Thêm profile để quản lý nhiều tài khoản với cookie riêng biệt</Text>
          <Pressable style={s.addBtn} onPress={() => setShowPicker(true)}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>Thêm Profile</Text>
          </Pressable>
        </View>
        <ProfilePickerModal
          visible={showPicker}
          profiles={filteredProfiles}
          activeIds={activeIds}
          search={pickerSearch}
          onSearchChange={setPickerSearch}
          onToggle={(id) => {
            if (activeIds.includes(id)) handleRemoveProfile(id);
            else handleAddProfile(id);
          }}
          onClose={() => { setShowPicker(false); setPickerSearch(""); }}
        />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.toolbar}>
        <Pressable style={s.toolIcon} onPress={() => setShowPicker(true)} hitSlop={6}>
          <Feather name="users" size={16} color={C.primary} />
          <View style={s.countBadge}>
            <Text style={s.countTxt}>{activeProfiles.length}</Text>
          </View>
        </Pressable>

        <View style={s.urlRow}>
          <TextInput
            style={s.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="URL hoặc tìm kiếm..."
            placeholderTextColor={C.textMuted}
          />
          <Pressable style={s.goBtn} onPress={handleSubmit}>
            <Feather name="arrow-right" size={14} color="#fff" />
          </Pressable>
        </View>
      </View>

      {!hasCookieIsolation && (
        <View style={s.warnBar}>
          <Feather name="alert-triangle" size={11} color="#f97316" />
          <Text style={s.warnTxt}>Expo Go: Cookie chưa tách. Build APK để cô lập hoàn toàn.</Text>
        </View>
      )}

      {hasCookieIsolation && (
        <View style={s.infoBar}>
          <Feather name="check-circle" size={11} color="#22c55e" />
          <Text style={s.infoTxt}>Cookie cô lập — mỗi tab dùng session riêng biệt</Text>
        </View>
      )}

      {scriptBanner ? (
        <View style={s.banner}>
          <Feather name="code" size={12} color={C.primary} />
          <Text style={[s.bannerTxt, { flex: 1 }]}>{scriptBanner}</Text>
          <Pressable onPress={() => setScriptBanner("")} hitSlop={8}>
            <Feather name="x" size={12} color={C.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
          {activeProfiles.map((profile, idx) => {
            const isActive = idx === activeIndex;
            return (
              <Pressable
                key={profile.id}
                style={[s.tab, isActive && { borderBottomColor: profile.color, borderBottomWidth: 2.5 }]}
                onPress={() => switchToIndex(idx)}
                onLongPress={() => handleRemoveProfile(profile.id)}
                hitSlop={4}
              >
                <View style={[s.tabDot, { backgroundColor: profile.color }]} />
                <Text style={[s.tabText, isActive && { color: C.text }]} numberOfLines={1}>
                  {profile.name}
                </Text>
                {isActive && (
                  <View style={[s.tabActiveDot, { backgroundColor: profile.color }]} />
                )}
              </Pressable>
            );
          })}
          <Pressable style={s.tabAdd} onPress={() => setShowPicker(true)} hitSlop={4}>
            <Feather name="plus" size={14} color={C.textMuted} />
          </Pressable>
        </ScrollView>
      </View>

      {switching ? (
        <View style={s.switchingOverlay}>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={s.switchingText}>Đang đổi profile cookie...</Text>
        </View>
      ) : currentProfile ? (
        <ActiveBrowser
          key={currentProfile.id}
          profile={currentProfile}
          url={currentUrl}
          pendingScript={pendingScript}
          onNavigate={handleNavigate}
        />
      ) : null}

      <View style={[s.statusBar, { paddingBottom: insets.bottom + 2 }]}>
        {currentProfile && (
          <>
            <View style={[s.profilePill, { backgroundColor: currentProfile.color + "20" }]}>
              <View style={[s.profileDot, { backgroundColor: currentProfile.color }]} />
              <Text style={[s.profilePillText, { color: currentProfile.color }]}>
                {currentProfile.name}
              </Text>
            </View>
            <Text style={s.statusUrl} numberOfLines={1}>{currentUrl}</Text>
          </>
        )}
        <Text style={s.tabHint}>Giữ tab để xoá</Text>
      </View>

      <ProfilePickerModal
        visible={showPicker}
        profiles={filteredProfiles}
        activeIds={activeIds}
        search={pickerSearch}
        onSearchChange={setPickerSearch}
        onToggle={(id) => {
          if (activeIds.includes(id)) handleRemoveProfile(id);
          else handleAddProfile(id);
        }}
        onClose={() => { setShowPicker(false); setPickerSearch(""); }}
      />
    </View>
  );
}

interface PickerProps {
  visible: boolean;
  profiles: BrowserProfile[];
  activeIds: string[];
  search: string;
  onSearchChange: (q: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}

function ProfilePickerModal({ visible, profiles, activeIds, search, onSearchChange, onToggle, onClose }: PickerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pm.bg} onPress={onClose} />
      <View style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={pm.handle} />
        <View style={pm.headerRow}>
          <Text style={pm.title}>Chọn Profiles ({activeIds.length})</Text>
          <Pressable onPress={onClose} style={pm.closeBtn}>
            <Feather name="x" size={18} color={C.textDim} />
          </Pressable>
        </View>
        <View style={pm.searchRow}>
          <Feather name="search" size={14} color={C.textMuted} />
          <TextInput
            style={pm.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Tìm profile..."
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
          />
          {search ? (
            <Pressable onPress={() => onSearchChange("")}>
              <Feather name="x" size={14} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          style={pm.list}
          renderItem={({ item: p }) => {
            const active = activeIds.includes(p.id);
            return (
              <Pressable
                style={[pm.row, active && { borderColor: p.color + "60", backgroundColor: p.color + "12" }]}
                onPress={() => onToggle(p.id)}
              >
                <View style={[pm.dot, { backgroundColor: p.color }]} />
                <Text style={[pm.name, active && { color: C.text }]}>{p.name}</Text>
                {active && <Feather name="check" size={16} color={p.color} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, gap: 8, backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  toolIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border },
  countBadge: { position: "absolute", top: -4, right: -4, backgroundColor: C.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  countTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  urlRow: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: C.border },
  urlInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.text },
  goBtn: { backgroundColor: C.primary, width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  warnBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f9731610", borderBottomWidth: 1, borderBottomColor: "#f9731620", paddingHorizontal: 12, paddingVertical: 6 },
  warnTxt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: "#f97316" },
  infoBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#22c55e10", borderBottomWidth: 1, borderBottomColor: "#22c55e20", paddingHorizontal: 12, paddingVertical: 5 },
  infoTxt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: "#22c55e" },
  banner: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.primaryDim, borderBottomWidth: 1, borderBottomColor: C.primary + "40", paddingHorizontal: 12, paddingVertical: 6 },
  bannerTxt: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.primary },
  tabBar: { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  tabScroll: { paddingHorizontal: 8, paddingVertical: 4, gap: 2 },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderBottomWidth: 2.5, borderBottomColor: "transparent" },
  tabDot: { width: 7, height: 7, borderRadius: 4 },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textMuted, maxWidth: 80 },
  tabActiveDot: { width: 5, height: 5, borderRadius: 3 },
  tabAdd: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  switchingOverlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: C.bg },
  switchingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  statusBar: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, paddingHorizontal: 12, paddingTop: 6, gap: 8, borderTopWidth: 1, borderTopColor: C.border },
  profilePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  profileDot: { width: 6, height: 6, borderRadius: 3 },
  profilePillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  statusUrl: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  tabHint: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.textMuted },
  emptyHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.text },
  emptyBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: C.text, textAlign: "center" },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.primary, borderRadius: C.radiusLg, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  addBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});

const pm = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, color: C.text },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: C.text },
  list: { maxHeight: 400 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border, borderLeftWidth: 3, borderLeftColor: "transparent", borderRadius: 4, margin: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: C.textDim },
});
