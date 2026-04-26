import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
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
import { useSettings } from "@/context/SettingsContext";
import { buildFingerprintJS } from "@/hooks/useFingerprintJS";
import { useProfileSession } from "@/hooks/useProfileSession";
import { BrowserProfile } from "@/types";

const HOME = "https://www.google.com";

function normalize(raw: string): string {
  const s = raw.trim();
  if (!s) return HOME;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.includes(".") && !s.includes(" ")) return `https://${s}`;
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

interface TileProps {
  profile: BrowserProfile;
  isMaster: boolean;
  mirrorEnabled: boolean;
  onMasterMessage: (data: object) => void;
  sharedUrl: string;
  columns: number;
  pendingScript?: string | null;
  onRegisterRef?: (id: string, ref: WebViewRef | null) => void;
}

function BrowserTile({ profile, isMaster, mirrorEnabled, onMasterMessage, sharedUrl, columns, pendingScript, onRegisterRef }: TileProps) {
  const { addHistoryEntry } = useProfiles();
  const session = useProfileSession(profile.id);
  const { settings } = useSettings();
  const ref = useRef<WebViewRef>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const scriptInjectedRef = useRef(false);

  const SELECTOR_INJECT = isMaster && mirrorEnabled ? `
(function() {
  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    var sel = el.tagName.toLowerCase();
    if (el.id) sel += '#' + el.id;
    else if (el.className) sel += '.' + Array.from(el.classList).slice(0,2).join('.');
    var siblings = Array.from(el.parentNode ? el.parentNode.children : []);
    var idx = siblings.indexOf(el);
    sel += ':nth-child(' + (idx + 1) + ')';
    return getSelector(el.parentElement) + ' > ' + sel;
  }
  document.addEventListener('click', function(e) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'click',selector:getSelector(e.target)})); } catch(err){}
  }, true);
  document.addEventListener('scroll', function() {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'scroll',x:window.scrollX,y:window.scrollY})); } catch(err){}
  }, true);
  document.addEventListener('input', function(e) {
    var el = e.target;
    try { window.ReactNativeWebView.postMessage(JSON.stringify({__bpm_mirror:true,action:'input',selector:getSelector(el),value:el.value})); } catch(err){}
  }, true);
  true;
})();
  ` : "";

  const injected = [
    settings.storageIsolationEnabled ? session.buildInjectJS() : "",
    settings.fingerprintEnabled ? buildFingerprintJS(profile.fingerprint) : "",
    SELECTOR_INJECT,
  ].filter(Boolean).join("\n");

  const handleMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.__bpm) session.applyMessage(data);
      else if (data.__bpm_mirror && isMaster && mirrorEnabled) onMasterMessage(data);
    } catch {
      // ignore
    }
  }, [session, isMaster, mirrorEnabled, onMasterMessage]);

  const handleNav = useCallback((nav: { url: string; title?: string }) => {
    if (!nav.url || nav.url === "about:blank") return;
    if (nav.title) setTitle(nav.title);
    if (!profile.isPrivate) addHistoryEntry(profile.id, nav.url, nav.title ?? nav.url);
  }, [profile, addHistoryEntry]);

  if (!session.ready) {
    return (
      <View style={[s.tile, { borderColor: profile.color + "40" }]}>
        <ActivityIndicator color={profile.color} />
      </View>
    );
  }

  return (
    <View style={[s.tile, isMaster && mirrorEnabled && { borderColor: C.warning, borderWidth: 2 }]}>
      <View style={[s.tileHeader, { backgroundColor: profile.color + "18" }]}>
        <View style={[s.tileDot, { backgroundColor: profile.color }]} />
        <Text style={s.tileName} numberOfLines={1}>{profile.name}</Text>
        {isMaster && mirrorEnabled && (
          <View style={s.masterBadge}>
            <Text style={s.masterText}>MASTER</Text>
          </View>
        )}
        {isLoading && <ActivityIndicator size="small" color={profile.color} />}
      </View>
      <CompatWebView
        ref={ref}
        uri={sharedUrl}
        userAgent={settings.fingerprintEnabled ? profile.fingerprint.userAgent : undefined}
        injectedJavaScriptBeforeContentLoaded={injected}
        javaScriptEnabled={profile.javascriptEnabled}
        domStorageEnabled
        sharedCookiesEnabled={profile.cookiesEnabled}
        cacheEnabled
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => {
          setIsLoading(false);
          if (pendingScript && !scriptInjectedRef.current) {
            scriptInjectedRef.current = true;
            setTimeout(() => {
              ref.current?.injectJavaScript?.(
                `(function(){try{${pendingScript}}catch(e){console.error('[BPM Script]',e.message);}})(); true;`
              );
            }, 400);
          }
        }}
        onNavigationStateChange={handleNav}
        onMessage={handleMessage}
        style={s.tileWeb}
      />
      <View style={[s.tileFpBar, { backgroundColor: profile.color + "10" }]}>
        <Text style={s.tileFpText} numberOfLines={1}>{profile.fingerprint.userAgent.slice(0, 45)}...</Text>
      </View>
    </View>
  );
}

const PENDING_SCRIPT_KEY = "@bpm_pending_script";

export default function MultiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles, selectedProfiles } = useProfiles();
  const { profileIds: profileIdsParam, autoScript } = useLocalSearchParams<{
    profileIds?: string;
    autoScript?: string;
  }>();

  const [columns, setColumns] = useState<1 | 2 | 3>(2);
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [sharedUrl, setSharedUrl] = useState(HOME);
  const [urlInput, setUrlInput] = useState(HOME);
  const tileRefs = useRef<Map<string, WebViewRef>>(new Map());
  const pendingScriptRef = useRef<string | null>(null);
  const [scriptBanner, setScriptBanner] = useState("");

  useEffect(() => {
    if (autoScript === "1") {
      AsyncStorage.getItem(PENDING_SCRIPT_KEY).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as { code: string; profileIds: string[]; timestamp: number };
          if (Date.now() - parsed.timestamp < 60000) {
            pendingScriptRef.current = parsed.code;
            setScriptBanner("Script đã sẵn sàng — inject khi trang tải xong");
          }
        } catch {}
      });
    }
  }, [autoScript]);

  const paramProfileIds = profileIdsParam ? profileIdsParam.split(",").filter(Boolean) : [];

  const activeProfiles = paramProfileIds.length > 0
    ? profiles.filter((p) => paramProfileIds.includes(p.id))
    : selectedProfiles.length > 0
      ? profiles.filter((p) => selectedProfiles.includes(p.id))
      : profiles.slice(0, 4);

  const masterProfile = activeProfiles[0];
  const screenW = Dimensions.get("window").width;

  function handleSubmit() {
    const url = normalize(urlInput);
    setSharedUrl(url);
    Keyboard.dismiss();
  }

  const handleMasterMessage = useCallback((data: any) => {
    const js = buildMirrorJS(data);
    if (!js) return;
    activeProfiles.forEach((p, idx) => {
      if (idx === 0) return;
      const ref = tileRefs.current.get(p.id);
      ref?.injectJavaScript(js);
    });
  }, [activeProfiles]);

  function buildMirrorJS(data: any): string | null {
    if (data.action === "scroll") {
      return `window.scrollTo(${data.x}, ${data.y}); true;`;
    }
    if (data.action === "click") {
      return `(function(){ try { var el = document.querySelector(${JSON.stringify(data.selector)}); if(el) el.click(); } catch(e){} true; })();`;
    }
    if (data.action === "input") {
      return `(function(){ try { var el = document.querySelector(${JSON.stringify(data.selector)}); if(el){ var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; nativeSetter.call(el,${JSON.stringify(data.value)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } } catch(e){} true; })();`;
    }
    return null;
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={18} color={C.textDim} />
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
            placeholder="URL hoặc từ khóa tìm kiếm..."
            placeholderTextColor={C.textMuted}
          />
          <Pressable style={s.goBtn} onPress={handleSubmit}>
            <Feather name="arrow-right" size={14} color="#fff" />
          </Pressable>
        </View>

        <Pressable
          style={[s.mirrorBtn, mirrorEnabled && { backgroundColor: C.warningDim, borderColor: C.warning }]}
          onPress={async () => {
            if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setMirrorEnabled((v) => !v);
          }}
        >
          <Feather name="zap" size={15} color={mirrorEnabled ? C.warning : C.textMuted} />
        </Pressable>

        <View style={s.colBtns}>
          {([1, 2, 3] as const).map((n) => (
            <Pressable
              key={n}
              style={[s.colBtn, columns === n && { backgroundColor: C.primaryDim }]}
              onPress={() => setColumns(n)}
            >
              <Text style={[s.colText, columns === n && { color: C.primary }]}>{n}x</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {mirrorEnabled && (
        <View style={s.mirrorBanner}>
          <Feather name="zap" size={12} color={C.warning} />
          <Text style={s.mirrorBannerText}>Mirror BẬT — {masterProfile?.name} là Master</Text>
        </View>
      )}

      {scriptBanner ? (
        <View style={s.scriptBanner}>
          <Feather name="code" size={12} color={C.primary} />
          <Text style={s.scriptBannerText}>{scriptBanner}</Text>
          <Pressable onPress={() => setScriptBanner("")} hitSlop={8}>
            <Feather name="x" size={12} color={C.textMuted} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[s.tilesWrap, { flexWrap: columns === 1 ? "nowrap" : "wrap" }]}>
          {activeProfiles.map((profile, idx) => (
            <View
              key={profile.id}
              style={{
                width: columns === 1 ? "100%" : columns === 2 ? "49%" : "32%",
                marginBottom: 8,
              }}
            >
              <BrowserTile
                profile={profile}
                isMaster={idx === 0}
                mirrorEnabled={mirrorEnabled}
                onMasterMessage={handleMasterMessage}
                sharedUrl={sharedUrl}
                columns={columns}
                pendingScript={pendingScriptRef.current}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const TILE_HEIGHT = 280;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, paddingHorizontal: 10, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  urlRow: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 6, borderWidth: 1, borderColor: C.border },
  urlInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: C.text },
  goBtn: { backgroundColor: C.primary, width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  mirrorBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  colBtns: { flexDirection: "row", gap: 2 },
  colBtn: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6 },
  colText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.textMuted },

  mirrorBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.warningDim, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.warning + "40" },
  mirrorBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.warning },
  scriptBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: C.primaryDim, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.primary + "40" },
  scriptBannerText: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.primary, flex: 1 },

  grid: { paddingHorizontal: 6, paddingTop: 8 },
  tilesWrap: { flexDirection: "row", gap: 6 },

  tile: { height: TILE_HEIGHT, borderRadius: C.radius, overflow: "hidden", borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  tileHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, gap: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  tileDot: { width: 7, height: 7, borderRadius: 4 },
  tileName: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.text },
  masterBadge: { backgroundColor: C.warningDim, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  masterText: { fontFamily: "Inter_700Bold", fontSize: 9, color: C.warning },
  tileWeb: { flex: 1 },
  tileFpBar: { paddingHorizontal: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: C.border },
  tileFpText: { fontFamily: "Inter_400Regular", fontSize: 9, color: C.textMuted },
});
