import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

export interface WebViewRef {
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  injectJavaScript: (js: string) => void;
}

interface Props {
  uri: string;
  userAgent?: string;
  injectedJavaScriptBeforeContentLoaded?: string;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  onNavigationStateChange?: (navState: {
    url: string;
    title?: string;
    canGoBack?: boolean;
    canGoForward?: boolean;
  }) => void;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  style?: object;
}

const CompatWebView = forwardRef<WebViewRef, Props>(function CompatWebView(props, ref) {
  const {
    uri,
    userAgent,
    injectedJavaScriptBeforeContentLoaded,
    javaScriptEnabled = true,
    domStorageEnabled = true,
    onLoadStart,
    onLoadEnd,
    onError,
    onProgress,
    onNavigationStateChange,
    onMessage,
    style,
  } = props;

  if (Platform.OS === "web") {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useImperativeHandle(ref, () => ({
      reload: () => {
        if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
      },
      goBack: () => iframeRef.current?.contentWindow?.history.back(),
      goForward: () => iframeRef.current?.contentWindow?.history.forward(),
      injectJavaScript: (js: string) => {
        try {
          iframeRef.current?.contentWindow?.eval(js);
        } catch (e) {
          console.warn("[CompatWebView] inject error", e);
        }
      },
    }));

    return (
      <View style={[styles.container, style]}>
        <iframe
          ref={iframeRef}
          src={uri}
          style={{ width: "100%", height: "100%", border: "none" }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => onLoadEnd?.()}
          onError={() => onError?.("Failed to load")}
        />
      </View>
    );
  }

  const WebView = require("react-native-webview").WebView;
  const nativeRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    reload: () => nativeRef.current?.reload(),
    goBack: () => nativeRef.current?.goBack(),
    goForward: () => nativeRef.current?.goForward(),
    injectJavaScript: (js: string) => nativeRef.current?.injectJavaScript(js),
  }));

  return (
    <WebView
      ref={nativeRef}
      source={{ uri }}
      userAgent={userAgent}
      injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
      javaScriptEnabled={javaScriptEnabled}
      domStorageEnabled={domStorageEnabled}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      incognito={false}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      onError={(e: any) => onError?.(e.nativeEvent?.description ?? "Error")}
      onLoadProgress={(e: any) => onProgress?.(e.nativeEvent?.progress ?? 0)}
      onNavigationStateChange={(navState: any) =>
        onNavigationStateChange?.({
          url: navState.url,
          title: navState.title,
          canGoBack: navState.canGoBack,
          canGoForward: navState.canGoForward,
        })
      }
      onMessage={onMessage}
      style={[styles.container, style]}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsBackForwardNavigationGestures
    />
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default CompatWebView;
