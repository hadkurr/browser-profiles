import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "__bpm_storage_";

interface StorageMessage {
  __bpm: true;
  type: "storage";
  kind: "local" | "session";
  action: "setItem" | "removeItem" | "clear";
  key?: string;
  value?: string;
}

interface StorageSnapshot {
  local: Record<string, string>;
  session: Record<string, string>;
}

export interface ProfileSession {
  ready: boolean;
  buildInjectJS: () => string;
  applyMessage: (data: StorageMessage) => void;
}

export function useProfileSession(profileId: string): ProfileSession {
  const [ready, setReady] = useState(false);
  const snapshotRef = useRef<StorageSnapshot>({ local: {}, session: {} });
  const pendingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_PREFIX + profileId);
        if (!cancelled) {
          snapshotRef.current = raw
            ? JSON.parse(raw)
            : { local: {}, session: {} };
          setReady(true);
        }
      } catch (e) {
        console.warn("[Session] load error", e);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const flush = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_PREFIX + profileId,
        JSON.stringify(snapshotRef.current)
      );
    } catch (e) {
      console.warn("[Session] flush error", e);
    }
  }, [profileId]);

  const applyMessage = useCallback(
    (data: StorageMessage) => {
      if (!data.__bpm || data.type !== "storage") return;
      const store = snapshotRef.current[data.kind];
      if (data.action === "setItem" && data.key !== undefined) {
        store[data.key] = data.value ?? "";
      } else if (data.action === "removeItem" && data.key !== undefined) {
        delete store[data.key];
      } else if (data.action === "clear") {
        if (data.kind === "local") snapshotRef.current.local = {};
        else snapshotRef.current.session = {};
      }
      if (pendingRef.current) clearTimeout(pendingRef.current);
      pendingRef.current = setTimeout(flush, 250);
    },
    [flush]
  );

  const buildInjectJS = useCallback((): string => {
    const local = JSON.stringify(snapshotRef.current.local);
    const session = JSON.stringify(snapshotRef.current.session);
    return `
(function() {
  try {
    // Hydrate localStorage
    var localData = ${local};
    for (var k in localData) { try { localStorage.setItem(k, localData[k]); } catch(e){} }

    // Hydrate sessionStorage
    var sessionData = ${session};
    for (var k in sessionData) { try { sessionStorage.setItem(k, sessionData[k]); } catch(e){} }

    // Hook localStorage mutations
    var _origLS = { set: localStorage.setItem.bind(localStorage), rm: localStorage.removeItem.bind(localStorage), cl: localStorage.clear.bind(localStorage) };
    localStorage.setItem = function(k,v) { _origLS.set(k,v); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'local',action:'setItem',key:k,value:v})); };
    localStorage.removeItem = function(k) { _origLS.rm(k); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'local',action:'removeItem',key:k})); };
    localStorage.clear = function() { _origLS.cl(); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'local',action:'clear'})); };

    // Hook sessionStorage mutations
    var _origSS = { set: sessionStorage.setItem.bind(sessionStorage), rm: sessionStorage.removeItem.bind(sessionStorage), cl: sessionStorage.clear.bind(sessionStorage) };
    sessionStorage.setItem = function(k,v) { _origSS.set(k,v); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'session',action:'setItem',key:k,value:v})); };
    sessionStorage.removeItem = function(k) { _origSS.rm(k); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'session',action:'removeItem',key:k})); };
    sessionStorage.clear = function() { _origSS.cl(); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({__bpm:true,type:'storage',kind:'session',action:'clear'})); };
  } catch(e) { console.warn('[BPM] session bridge error', e); }
  true;
})();
    `.trim();
  }, []);

  return { ready, buildInjectJS, applyMessage };
}
