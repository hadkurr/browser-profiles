import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { loadQueue } from "@/utils/loadQueue";
import { isCookieIsolationAvailable } from "@/utils/cookieManager";
import { BrowserProfile } from "@/types";

const HOME = "https://www.google.com";
const PENDING_SCRIPT_KEY = "@bpm_pending_script";
const MAX_PROFILES = 100;

function normalize(raw: string): string {
  const s = raw.trim();
  if (!s) return HOME;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.includes(".") && !s.includes(" ")) return "https://" + s;
  return "https://www.google.com/search?q=" + encodeURIComponent(s);
}

function buildMirrorJS(data: any): string | null {
  if (data.action === "scroll")
    return `window.scrollTo(${data.x},${data.y});true;`;
  if (data.action === "click")
    return `(function(){try{var el=document.querySelector(${JSON.stringify(data.selector)});if(el)el.click();}catch(e){}true;})();`;
  if (data.action === "input")
    return `(function(){try{var el=document.querySelector(${JSON.stringify(data.selector)});if(el){var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,${JSON.stringify(data.value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}}catch(e){}true;})();`;
  return null;
}

type TileLoadState = "waiting" | "loading" | "loaded" | "error";

interface TileProps {
  profile: BrowserProfile;
  isMaster: boolean;
  mirrorEnabled: boolean;
  targetUrl: string;
  loadState: TileLoadState;
  tileHeight: number;
  pendingScript: string | null;
  onMasterAction: (data: object) => void;
  onRegisterRef: (id: string, ref: WebViewRef | null) => void;
  onLoaded: (profileId: string, url: string) => void;
}

const BrowserTile = React.memo(function BrowserTile({
  profile,
  isMaster,
  mirrorEnabled,
  targetUrl,
  loadState,
  tileHeight,
  pendingScript,
  onMasterAction,
  onRegisterRef,
  onLoaded,
}: TileProps) {
  const { addHistoryEntry } = useProfiles();
  const session = useProfileSession(profile.id);
  const ref = useRef<WebViewRef>(null);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const scriptInjectedRef = useRef(false);
  const lastLoadedUrlRef = useRef<string>("");

  useEffect(() => {
    onRegisterRef(profile.id, ref.current);
    return () => onRegisterRef(profile.id, null);
  });

  useEffect(() => {
    if (loadState === "loading" && currentUri !== targetUrl) {
      setCurrentUri(targetUrl);
    }
  }, [loadState, targetUrl]);

  const MIRROR_CAPTURE = isMaster && mirrorEnabled
    ? `(function(){function getSelector(el){if(!el||el===document.body)return'body';var sel=el.tagName.toLowerCase();if(el.id)sel+='#'+el.id;else if(el.className)sel+='.'+Array.from(el.classList).slice(0,2).join('.');var siblings=Array.from(el.parentNode?el.parentNode.children:[]);var idx=siblings.indexOf(el);sel+=':nth-child('+(idx+1)+')';return getSelector(el.parentElement)+' > '+sel;}
document.addEventListener('click',function(e){try{window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'click',selector:getSelector(e.target)}));}catch(err){}},true);
document.addEventListener('scroll',function(){try{window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'scroll',x:window.scrollX,y:window.scrollY}));}catch(err){}},true);
document.addEventListener('input',function(e){var el=e.target;try{window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'input',selector:getSelector(el),value:el.value}));}catch(err){}},true);true;})();`
    : "";

  const injected = [
    session.buildInjectJS(),
    buildFingerprintJS(profile.fingerprint),
    MIRROR_CAPTURE,
  ]
    .filter(Boolean)
    .join("\n");

  const handleMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(e.nativeEvent.data);
        if (data.__bpm) session.applyMessage(data);
        else if (data.__bpm_mirror && isMaster && mirrorEnabled)
          onMasterAction(data);
      } catch {}
    },
    [session, isMaster, mirrorEnabled, onMasterAction]
  );

  const handleNav = useCallback(
    (nav: { url: string; title?: string }) => {
      if (!nav.url || nav.url === "about:blank") return;
      if (!profile.isPrivate) addHistoryEntry(profile.id, nav.url, nav.title ?? nav.url);
    },
    [profile, addHistoryEntry]
  );

  const handleLoadEnd = useCallback(() => {
    if (!currentUri || currentUri === "about:blank") return;
    if (pendingScript && !scriptInjectedRef.current) {
      scriptInjectedRef.current = true;
      setTimeout(() => {
        ref.current?.injectJavaScript?.(
          `(function(){try{${pendingScript}}catch(e){console.error('[BPM]',e.message);}})();true;`
        );
      }, 400);
    }
    if (currentUri !== lastLoadedUrlRef.current) {
      lastLoadedUrlRef.current = currentUri;
      onLoaded(profile.id, currentUri);
    }
  }, [currentUri, pendingScript, profile.id, onLoaded]);

  if (!session.ready) {
    return (
      <View
        style={[
          ts.tile,
          { height: tileHeight, borderColor: profile.color + "40", justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={profile.color} />
        <Text style={[ts.statusTxt, { color: profile.color, marginTop: 6 }]}>Khởi tạo...</Text>
      </View>
    );
  }

  if (loadState === "waiting") {
    return (
      <View
        style={[
          ts.tile,
          { height: tileHeight, borderColor: profile.color + "22", justifyContent: "center", alignItems: "center", gap: 8 },
        ]}
      >
        <View style={[ts.tileDotLg, { backgroundColor: profile.color }]} />
        <Text style={ts.statusTxt}>{profile.name}</Text>
        <View style={ts.queueBadge}>
          <ActivityIndicator size="small" color={C.textMuted} />
          <Text style={ts.queueTxt}>Đang chờ...</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        ts.tile,
        { height: tileHeight, borderColor: profile.color + "40" },
        isMaster && mirrorEnabled && { borderColor: C.warning, borderWidth: 2 },
      ]}
    >
      <View style={[ts.tileHeader, { backgroundColor: profile.color + "18" }]}>
        <View style={[ts.tileDot, { backgroundColor: profile.color }]} />
        <Text style={ts.tileName} numberOfLines={1}>
          {profile.name}
        </Text>
        {isMaster && mirrorEnabled && (
          <Text style={ts.masterBadge}>MASTER</Text>
        )}
        {loadState === "loading" && (
          <ActivityIndicator size="small" color={profile.color} style={{ marginLeft: 4 }} />
        )}
        {loadState === "loaded" && (
          <Feather name="check-circle" size={10} color="#22c55e" style={{ marginLeft: 4 }} />
        )}
      </View>

      {currentUri ? (
        <CompatWebView
          ref={ref}
          uri={currentUri}
          userAgent={profile.fingerprint.userAgent}
          injectedJavaScriptBeforeContentLoaded={injected}
          javaScriptEnabled={profile.javascriptEnabled}
          domStorageEnabled
          onLoadStart={() => {}}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNav}
          onMessage={handleMessage}
          style={ts.tileWeb}
        />
      ) : (
        <View style={[ts.tileWeb, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator color={profile.color} />
          <Text style={[ts.statusTxt, { marginTop: 6, color: profile.color }]}>
            Đang set cookie...
          </Text>
        </View>
      )}

      <View style={[ts.tileFpBar, { backgroundColor: profile.color + "10" }]}>
        <Text style={ts.tileFpText} numberOfLines={1}>
          {profile.fingerprint.userAgent.slice(0, 50)}
        </Text>
      </View>
    </View>
  );
});

export default function MultiTabScreen() {
  const insets = useSafeAreaInsets();
  const { profiles } = useProfiles();

  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<1 | 2 | 3>(2);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [sharedUrl, setSharedUrl] = useState(HOME);
  const [urlInput, setUrlInput] = useState(HOME);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pendingScript, setPendingScript] = useState<string | null>(null);
  const [scriptBanner, setScriptBanner] = useState("");
  const [tileStates, setTileStates] = useState<Record<string, TileLoadState>>({});
  const hasCookieIsolation = isCookieIsolationAvailable();

  const tileRefsMap = useRef<Map<string, WebViewRef>>(new Map());
  const queuedIds = useRef<Set<string>>(new Set());

  const activeProfiles = useMemo(
    () => profiles.filter((p) => activeIds.includes(p.id)),
    [profiles, activeIds]
  );

  const TILE_HEIGHT =
    columns === 1
      ? Math.min(420, Dimensions.get("window").height * 0.55)
      : 280;

  useEffect(() => {
    AsyncStorage.getItem(PENDING_SCRIPT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          code: string;
          profileIds: string[];
          timestamp: number;
        };
        if (Date.now() - parsed.timestamp < 300000) {
          setPendingScript(parsed.code);
          setScriptBanner("Script sẵn sàng — inject vào trang tiếp theo");
          if (parsed.profileIds.length > 0) {
            setActiveIds((prev) => {
              const next = [...new Set([...prev, ...parsed.profileIds])];
              return next.slice(0, MAX_PROFILES);
            });
          }
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    for (const id of activeIds) {
      if (!queuedIds.current.has(id)) {
        queuedIds.current.add(id);
        setTileStates((s) => ({ ...s, [id]: "waiting" }));

        loadQueue.enqueue(id, sharedUrl).then(() => {
          setTileStates((s) => ({ ...s, [id]: "loading" }));
        });
      }
    }
  }, [activeIds, sharedUrl]);

  const handleReloadAll = useCallback(() => {
    queuedIds.current.clear();
    loadQueue.clear();
    setTileStates({});
    const ids = [...activeIds];
    for (const id of ids) {
      queuedIds.current.add(id);
      setTileStates((s) => ({ ...s, [id]: "waiting" }));
      loadQueue.enqueue(id, sharedUrl).then(() => {
        setTileStates((s) => ({ ...s, [id]: "loading" }));
      });
    }
  }, [activeIds, sharedUrl]);

  const handleRegisterRef = useCallback(
    (id: string, ref: WebViewRef | null) => {
      if (ref) tileRefsMap.current.set(id, ref);
      else tileRefsMap.current.delete(id);
    },
    []
  );

  const handleMasterAction = useCallback(
    (data: any) => {
      const js = buildMirrorJS(data);
      if (!js) return;
      activeProfiles.forEach((p, idx) => {
        if (idx === 0) return;
        tileRefsMap.current.get(p.id)?.injectJavaScript(js);
      });
    },
    [activeProfiles]
  );

  const handleTileLoaded = useCallback(
    (profileId: string, url: string) => {
      loadQueue.signalLoaded(profileId);
      setTileStates((s) => ({ ...s, [profileId]: "loaded" }));
    },
    []
  );

  function handleSubmit() {
    const url = normalize(urlInput);
    setSharedUrl(url);
    Keyboard.dismiss();
    handleReloadAll();
  }

  function toggleProfile(id: string) {
    setActiveIds((prev) => {
      if (prev.includes(id)) {
        queuedIds.current.delete(id);
        setTileStates((s) => {
          const next = { ...s };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_PROFILES) return prev;
      return [...prev, id];
    });
    Haptics.selectionAsync().catch(() => {});
  }

  const filteredProfiles = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return q
      ? profiles.filter((p) => p.name.toLowerCase().includes(q))
      : profiles;
  }, [profiles, pickerSearch]);

  const loadedCount = Object.values(tileStates).filter((s) => s === "loaded").length;
  const totalCount = activeProfiles.length;

  const tileWidth =
    columns === 1 ? "100%" : columns === 2 ? "49.2%" : "32.5%";

  if (activeProfiles.length === 0) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.emptyHeader}>
          <Text style={s.title}>Multi Browser</Text>
        </View>
        <View style={s.emptyBody}>
          <Feather name="grid" size={52} color={C.textMuted} />
          <Text style={s.emptyTitle}>Chưa có profile nào đang mở</Text>
          <Text style={s.emptyDesc}>
            Thêm profile để bắt đầu duyệt nhiều tài khoản cùng lúc
          </Text>
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
          onToggle={toggleProfile}
          onClose={() => {
            setShowPicker(false);
            setPickerSearch("");
          }}
        />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.toolbar}>
        <Pressable
          style={s.toolIcon}
          onPress={() => setShowPicker(true)}
          hitSlop={6}
        >
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

        <Pressable
          style={[
            s.toolIcon,
            mirrorEnabled && { backgroundColor: C.warningDim, borderColor: C.warning },
          ]}
          onPress={async () => {
            if (Platform.OS !== "web")
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setMirrorEnabled((v) => !v);
          }}
          hitSlop={6}
        >
          <Feather
            name="zap"
            size={16}
            color={mirrorEnabled ? C.warning : C.textMuted}
          />
        </Pressable>

        <Pressable style={s.toolIcon} onPress={handleReloadAll} hitSlop={6}>
          <Feather name="refresh-cw" size={14} color={C.textMuted} />
        </Pressable>

        <View style={s.colBtns}>
          {([1, 2, 3] as const).map((n) => (
            <Pressable
              key={n}
              style={[s.colBtn, columns === n && s.colBtnActive]}
              onPress={() => setColumns(n)}
            >
              <Text style={[s.colTxt, columns === n && { color: C.primary }]}>
                {n}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!hasCookieIsolation && (
        <View style={s.warnBar}>
          <Feather name="alert-triangle" size={11} color="#f97316" />
          <Text style={s.warnTxt}>
            Cookie dùng chung (Expo Go). Tách hoàn toàn cần build APK custom.
          </Text>
        </View>
      )}

      {hasCookieIsolation && loadedCount < totalCount && (
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(loadedCount / totalCount) * 100}%` }]} />
          <Text style={s.progressTxt}>
            Cookie isolation: {loadedCount}/{totalCount} profile đã tách xong
          </Text>
        </View>
      )}

      {mirrorEnabled && (
        <View style={s.banner}>
          <Feather name="zap" size={12} color={C.warning} />
          <Text style={[s.bannerTxt, { color: C.warning }]}>
            Mirror BẬT — {activeProfiles[0]?.name} là Master
          </Text>
        </View>
      )}

      {scriptBanner ? (
        <View
          style={[
            s.banner,
            { borderBottomColor: C.primary + "40", backgroundColor: C.primaryDim },
          ]}
        >
          <Feather name="code" size={12} color={C.primary} />
          <Text style={[s.bannerTxt, { color: C.primary, flex: 1 }]}>
            {scriptBanner}
          </Text>
          <Pressable onPress={() => setScriptBanner("")} hitSlop={8}>
            <Feather name="x" size={12} color={C.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        style={s.grid}
        contentContainerStyle={[
          s.gridContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <View style={s.tilesRow}>
          {activeProfiles.map((profile, idx) => (
            <View
              key={profile.id}
              style={[s.tileWrap, { width: tileWidth as any }]}
            >
              <BrowserTile
                profile={profile}
                isMaster={idx === 0}
                mirrorEnabled={mirrorEnabled}
                targetUrl={sharedUrl}
                loadState={tileStates[profile.id] ?? "waiting"}
                tileHeight={TILE_HEIGHT}
                pendingScript={pendingScript}
                onMasterAction={handleMasterAction}
                onRegisterRef={handleRegisterRef}
                onLoaded={handleTileLoaded}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <ProfilePickerModal
        visible={showPicker}
        profiles={filteredProfiles}
        activeIds={activeIds}
        search={pickerSearch}
        onSearchChange={setPickerSearch}
        onToggle={toggleProfile}
        onClose={() => {
          setShowPicker(false);
          setPickerSearch("");
        }}
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

function ProfilePickerModal({
  visible,
  profiles,
  activeIds,
  search,
  onSearchChange,
  onToggle,
  onClose,
}: PickerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={pm.bg} onPress={onClose} />
      <View style={[pm.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={pm.handle} />
        <View style={pm.headerRow}>
          <Text style={pm.title}>
            Chọn Profiles ({activeIds.length}/{MAX_PROFILES})
          </Text>
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
            const order = activeIds.indexOf(p.id) + 1;
            return (
              <Pressable
                style={[
                  pm.row,
                  active && {
                    borderColor: p.color + "60",
                    backgroundColor: p.color + "12",
                  },
                ]}
                onPress={() => onToggle(p.id)}
              >
                <View
                  style={[
                    pm.check,
                    active && {
                      backgroundColor: p.color,
                      borderColor: p.color,
                    },
                  ]}
                >
                  {active && <Feather name="check" size={11} color="#fff" />}
                </View>
                <View style={[pm.dot, { backgroundColor: p.color }]} />
                <View style={pm.info}>
                  <Text style={pm.name}>{p.name}</Text>
                  <Text style={pm.sub}>{p.fingerprint.platform}</Text>
                </View>
                {active && (
                  <View
                    style={[pm.orderBadge, { backgroundColor: p.color }]}
                  >
                    <Text style={pm.orderTxt}>{order}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
        <Pressable style={pm.doneBtn} onPress={onClose}>
          <Text style={pm.doneTxt}>
            Xong — {activeIds.length} profile đã chọn
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const ts = StyleSheet.create({
  tile: {
    borderRadius: C.radius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tileDot: { width: 7, height: 7, borderRadius: 4 },
  tileDotLg: { width: 14, height: 14, borderRadius: 7 },
  tileName: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: C.text,
  },
  masterBadge: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: C.warning,
    backgroundColor: C.warningDim,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileWeb: { flex: 1 },
  tileFpBar: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tileFpText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: C.textMuted,
  },
  statusTxt: { fontSize: 11, color: C.textMuted, fontFamily: "Inter_500Medium" },
  queueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  queueTxt: { fontSize: 10, color: C.textMuted, fontFamily: "Inter_400Regular" },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  emptyHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: C.textBright },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: C.radiusLg,
    marginTop: 8,
  },
  addBtnTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  toolIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInput,
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.primary,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  countTxt: { fontSize: 9, fontWeight: "700", color: "#fff" },
  urlRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgInput,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  urlInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: C.text },
  goBtn: {
    backgroundColor: C.primary,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  colBtns: { flexDirection: "row", gap: 2 },
  colBtn: { paddingHorizontal: 6, paddingVertical: 5, borderRadius: 6 },
  colBtnActive: { backgroundColor: C.primaryDim },
  colTxt: { fontSize: 11, fontWeight: "600", color: C.textMuted },

  warnBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(249,115,22,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(249,115,22,0.25)",
  },
  warnTxt: {
    flex: 1,
    fontSize: 10,
    color: "#f97316",
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 22,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: C.primaryDim,
  },
  progressTxt: {
    fontSize: 10,
    color: C.textDim,
    fontFamily: "Inter_400Regular",
  },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.warningDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.warning + "40",
  },
  bannerTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },

  grid: { flex: 1 },
  gridContent: { paddingHorizontal: 6, paddingTop: 8 },
  tilesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tileWrap: {},
});

const pm = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingTop: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "700", color: C.textBright },
  closeBtn: { padding: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bgInput,
    borderRadius: C.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text },
  list: { maxHeight: 360 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: C.radiusSm,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
    marginBottom: 6,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: "600", color: C.text },
  sub: { fontSize: 11, color: C.textMuted },
  orderBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  orderTxt: { fontSize: 10, fontWeight: "700", color: "#fff" },
  doneBtn: {
    marginTop: 10,
    backgroundColor: C.primary,
    borderRadius: C.radius,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
