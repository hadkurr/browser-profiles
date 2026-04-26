import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

import C from "@/constants/colors";
import { useProfiles } from "@/context/ProfileContext";
import { getPythonVersion, installPipPackages, runPythonScript } from "@/utils/apiUrl";

const PENDING_SCRIPT_KEY = "@bpm_pending_script";

type Mode = "js" | "python";

interface LogEntry {
  id: string;
  type: "stdout" | "stderr" | "info" | "error" | "success";
  text: string;
  time: string;
}

const JS_TEMPLATES = [
  {
    label: "Lấy tiêu đề trang",
    code: `// Lấy tiêu đề và URL trang hiện tại
var result = {
  title: document.title,
  url: window.location.href,
  time: new Date().toLocaleString()
};
console.log(JSON.stringify(result, null, 2));`,
  },
  {
    label: "Thu thập tất cả link",
    code: `// Thu thập tất cả link trên trang
var links = Array.from(document.querySelectorAll('a[href]'))
  .map(a => ({ text: a.innerText.trim().slice(0,60), href: a.href }))
  .filter(l => l.href.startsWith('http'))
  .slice(0, 30);
console.log('Tìm thấy ' + links.length + ' link:');
links.forEach((l, i) => console.log((i+1) + '. ' + l.text + ' => ' + l.href));`,
  },
  {
    label: "Điền form tự động",
    code: `// Điền form tự động
var inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
inputs.forEach(function(inp) {
  if (inp.placeholder && inp.placeholder.toLowerCase().includes('email')) {
    inp.value = 'test@example.com';
    inp.dispatchEvent(new Event('input', {bubbles:true}));
    inp.dispatchEvent(new Event('change', {bubbles:true}));
  }
});
console.log('Đã xử lý ' + inputs.length + ' input field');`,
  },
  {
    label: "Cuộn xuống chậm",
    code: `// Cuộn trang xuống từ từ
var scrollStep = 0;
var interval = setInterval(function() {
  window.scrollBy(0, 100);
  scrollStep++;
  if (scrollStep >= 50 || window.innerHeight + window.scrollY >= document.body.scrollHeight) {
    clearInterval(interval);
    console.log('Đã cuộn xong sau ' + scrollStep + ' bước');
  }
}, 100);`,
  },
  {
    label: "Xóa quảng cáo",
    code: `// Ẩn quảng cáo phổ biến
var selectors = ['[id*="ad"]','[class*="banner"]','[class*="popup"]',
  '[class*="overlay"]:not([class*="video"])','iframe[src*="ads"]'];
var count = 0;
selectors.forEach(function(sel) {
  document.querySelectorAll(sel).forEach(function(el) {
    el.style.display = 'none'; count++;
  });
});
console.log('Đã ẩn ' + count + ' phần tử quảng cáo');`,
  },
  {
    label: "Lấy cookies",
    code: `// Đọc danh sách cookie
var cookies = document.cookie.split(';')
  .map(c => c.trim())
  .filter(c => c.length > 0);
console.log('Cookies (' + cookies.length + '):');
cookies.forEach(function(c) { console.log(' - ' + c); });`,
  },
];

const PY_TEMPLATES = [
  {
    label: "Hello World",
    code: `print("Xin chào từ Python 3!")
import sys
print("Python version:", sys.version)`,
  },
  {
    label: "Requests HTTP",
    code: `import requests

url = "https://httpbin.org/json"
try:
    resp = requests.get(url, timeout=10)
    data = resp.json()
    print("Status:", resp.status_code)
    print("Data:", data)
except Exception as e:
    print("Lỗi:", e)`,
  },
  {
    label: "Xử lý JSON",
    code: `import json

data = {
    "name": "Browser Profile Manager",
    "version": "2.0",
    "profiles": ["Cá nhân", "Công việc", "Dev"],
    "features": ["fingerprint", "session", "mirror"]
}

pretty = json.dumps(data, ensure_ascii=False, indent=2)
print(pretty)
print("\\nTổng:", len(data["profiles"]), "profiles")`,
  },
  {
    label: "BeautifulSoup scrape",
    code: `import requests
from bs4 import BeautifulSoup

url = "https://news.ycombinator.com"
try:
    r = requests.get(url, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")
    titles = soup.select(".titleline a")[:10]
    print("Top HN stories:")
    for i, t in enumerate(titles, 1):
        print(f"  {i}. {t.text[:70]}")
except Exception as e:
    print("Lỗi:", e)`,
  },
  {
    label: "Xử lý CSV",
    code: `import csv
import io

data = """ten,tuoi,thanh_pho
Nguyen Van A,25,Ha Noi
Tran Thi B,30,HCM
Le Van C,28,Da Nang"""

reader = csv.DictReader(io.StringIO(data))
rows = list(reader)
print(f"Tổng: {len(rows)} dòng")
for row in rows:
    print(f"  {row['ten']} - {row['tuoi']} tuổi - {row['thanh_pho']}")`,
  },
  {
    label: "Regex & xử lý text",
    code: `import re

text = """
  Email: user@example.com và admin@test.org
  Điện thoại: 0901234567, 0987654321
  Website: https://example.com
"""

emails = re.findall(r'[\\w.+-]+@[\\w-]+\\.[\\w.]+', text)
phones = re.findall(r'0\\d{9}', text)
urls   = re.findall(r'https?://[\\w./\\-]+', text)

print("Emails:", emails)
print("SĐT:   ", phones)
print("URLs:  ", urls)`,
  },
];

function now(): string {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ScriptScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles } = useProfiles();

  const [mode, setMode] = useState<Mode>("js");
  const [code, setCode] = useState(JS_TEMPLATES[0].code);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [pyVersion, setPyVersion] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPipModal, setShowPipModal] = useState(false);
  const [pipInput, setPipInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getPythonVersion().then(setPyVersion);
  }, []);

  useEffect(() => {
    setCode(mode === "js" ? JS_TEMPLATES[0].code : PY_TEMPLATES[0].code);
    setLogs([]);
    if (mode === "js") {
      setSelectedProfiles(profiles.slice(0, 1).map((p) => p.id));
    }
  }, [mode]);

  const addLog = useCallback((type: LogEntry["type"], text: string) => {
    setLogs((prev) => [...prev, { id: uid(), type, text, time: now() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const toggleProfile = useCallback((id: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    Haptics.selectionAsync();
  }, []);

  const runJS = useCallback(async () => {
    if (!code.trim()) { addLog("error", "Code trống"); return; }
    if (selectedProfiles.length === 0) { addLog("error", "Chưa chọn profile"); return; }

    addLog("info", `▶ Chạy JS trên ${selectedProfiles.length} profile...`);
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await AsyncStorage.setItem(
        PENDING_SCRIPT_KEY,
        JSON.stringify({ code, profileIds: selectedProfiles, timestamp: Date.now() })
      );

      if (selectedProfiles.length === 1) {
        router.push(`/browser/${selectedProfiles[0]}?autoScript=1`);
      } else {
        const ids = selectedProfiles.join(",");
        router.push(`/browser/multi?profileIds=${encodeURIComponent(ids)}&autoScript=1`);
      }
      addLog("success", "✓ Script đã lưu — mở browser để inject");
    } catch (e: unknown) {
      addLog("error", "Lỗi: " + String(e));
    } finally {
      setRunning(false);
    }
  }, [code, selectedProfiles, addLog, router]);

  const runPython = useCallback(async () => {
    if (!code.trim()) { addLog("error", "Code trống"); return; }

    clearLogs();
    addLog("info", "▶ Đang chạy Python...");
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await runPythonScript(code, 30);

      if (result.stdout) {
        result.stdout.split("\n").forEach((line) => {
          if (line.trim()) addLog("stdout", line);
        });
      }
      if (result.stderr) {
        result.stderr.split("\n").forEach((line) => {
          if (line.trim()) addLog("stderr", line);
        });
      }

      const status = result.exitCode === 0 ? "success" : "error";
      addLog(status, `✓ Xong trong ${result.duration}ms — exit code: ${result.exitCode}`);
    } catch (e: unknown) {
      addLog("error", "Lỗi kết nối API: " + String(e));
    } finally {
      setRunning(false);
    }
  }, [code, addLog, clearLogs]);

  const handlePipInstall = useCallback(async () => {
    const packages = pipInput.trim().split(/[\s,]+/).filter(Boolean);
    if (packages.length === 0) return;

    setShowPipModal(false);
    setPipInput("");
    addLog("info", `📦 Cài package: ${packages.join(", ")}...`);
    setRunning(true);

    try {
      const result = await installPipPackages(packages);
      if (result.exitCode === 0) {
        addLog("success", `✓ Đã cài: ${result.installed.join(", ")} (${result.duration}ms)`);
      } else {
        addLog("error", "Lỗi pip:\n" + result.stderr.slice(0, 500));
      }
    } catch (e: unknown) {
      addLog("error", "Lỗi: " + String(e));
    } finally {
      setRunning(false);
    }
  }, [pipInput, addLog]);

  const templates = mode === "js" ? JS_TEMPLATES : PY_TEMPLATES;

  const logColor: Record<LogEntry["type"], string> = {
    stdout: C.text,
    stderr: C.warning,
    info: C.accent,
    error: C.error,
    success: C.success,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Script Runner</Text>
        <View style={styles.modeRow}>
          {(["js", "python"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            >
              <Feather
                name={m === "js" ? "zap" : "terminal"}
                size={13}
                color={mode === m ? C.textBright : C.textMuted}
              />
              <Text style={[styles.modeTxt, mode === m && styles.modeTxtActive]}>
                {m === "js" ? "JavaScript" : "Python"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {mode === "js" && (
            <View style={styles.profileSection}>
              <Text style={styles.sectionLabel}>Inject vào profile</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileScroll}>
                {profiles.map((p) => {
                  const sel = selectedProfiles.includes(p.id);
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => toggleProfile(p.id)}
                      style={[
                        styles.profileChip,
                        { borderColor: sel ? p.color : C.border },
                        sel && { backgroundColor: p.color + "22" },
                      ]}
                    >
                      <View style={[styles.profileDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.profileChipTxt, sel && { color: p.color }]}>
                        {p.name}
                      </Text>
                      {sel && <Feather name="check" size={11} color={p.color} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {mode === "python" && (
            <View style={styles.pyInfo}>
              <Feather name="cpu" size={13} color={C.accent} />
              <Text style={styles.pyInfoTxt}>{pyVersion || "Đang kiểm tra Python..."}</Text>
            </View>
          )}

          <View style={styles.editorHeader}>
            <Text style={styles.sectionLabel}>
              {mode === "js" ? "JavaScript" : "Python 3"} Code
            </Text>
            <View style={styles.editorActions}>
              <Pressable onPress={() => setShowTemplates(true)} style={styles.iconBtn}>
                <Feather name="layout" size={15} color={C.textDim} />
                <Text style={styles.iconBtnTxt}>Template</Text>
              </Pressable>
              <Pressable onPress={() => setCode("")} style={styles.iconBtn}>
                <Feather name="trash-2" size={15} color={C.textDim} />
              </Pressable>
            </View>
          </View>

          <View style={styles.editorWrap}>
            <TextInput
              value={code}
              onChangeText={setCode}
              multiline
              scrollEnabled={false}
              style={styles.editor}
              placeholder={`Nhập ${mode === "js" ? "JavaScript" : "Python"} code...`}
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
          </View>

          <View style={styles.runRow}>
            <Pressable
              onPress={mode === "js" ? runJS : runPython}
              disabled={running}
              style={[styles.runBtn, running && styles.runBtnDisabled]}
            >
              {running ? (
                <ActivityIndicator size="small" color={C.textBright} />
              ) : (
                <Feather name="play" size={16} color={C.textBright} />
              )}
              <Text style={styles.runBtnTxt}>
                {running ? "Đang chạy..." : mode === "js" ? "Chạy trong Browser" : "Chạy Python"}
              </Text>
            </Pressable>

            {mode === "python" && (
              <Pressable
                onPress={() => setShowPipModal(true)}
                style={styles.pipBtn}
              >
                <Feather name="package" size={15} color={C.accent} />
                <Text style={styles.pipBtnTxt}>pip install</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.consoleHeader}>
            <Feather name="terminal" size={13} color={C.textMuted} />
            <Text style={styles.sectionLabel}>Output Console</Text>
            {logs.length > 0 && (
              <Pressable onPress={clearLogs} style={styles.clearBtn}>
                <Feather name="x" size={13} color={C.textMuted} />
                <Text style={styles.clearTxt}>Xóa</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.console}>
            <ScrollView
              ref={scrollRef}
              style={styles.consoleFeed}
              nestedScrollEnabled
            >
              {logs.length === 0 ? (
                <Text style={styles.consolePlaceholder}>
                  {mode === "js"
                    ? "Chọn profile → Chạy trong Browser → Kết quả hiển thị tại đây"
                    : "Chạy script Python — stdout/stderr hiển thị tại đây"}
                </Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logLine}>
                    <Text style={styles.logTime}>{log.time}</Text>
                    <Text style={[styles.logText, { color: logColor[log.type] }]}>
                      {log.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showTemplates} transparent animationType="slide">
        <Pressable style={styles.modalBg} onPress={() => setShowTemplates(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            Template {mode === "js" ? "JavaScript" : "Python"}
          </Text>
          <ScrollView>
            {templates.map((tpl, i) => (
              <Pressable
                key={i}
                onPress={() => { setCode(tpl.code); setShowTemplates(false); }}
                style={styles.tplItem}
              >
                <Feather name="code" size={15} color={C.primary} />
                <Text style={styles.tplLabel}>{tpl.label}</Text>
                <Feather name="chevron-right" size={15} color={C.textMuted} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPipModal} transparent animationType="fade">
        <View style={styles.pipModalBg}>
          <View style={styles.pipModalCard}>
            <Text style={styles.pipModalTitle}>📦 pip install</Text>
            <Text style={styles.pipModalSub}>Nhập tên package (cách nhau bằng dấu phẩy hoặc space)</Text>
            <TextInput
              value={pipInput}
              onChangeText={setPipInput}
              style={styles.pipInput}
              placeholder="vd: requests, beautifulsoup4, pandas"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.pipBtns}>
              <Pressable onPress={() => setShowPipModal(false)} style={styles.pipCancel}>
                <Text style={styles.pipCancelTxt}>Hủy</Text>
              </Pressable>
              <Pressable onPress={handlePipInstall} style={styles.pipInstall}>
                <Text style={styles.pipInstallTxt}>Cài đặt</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14, paddingBottom: 20 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: C.textBright, marginBottom: 10 },
  modeRow: { flexDirection: "row", gap: 8 },
  modeBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: C.radiusSm, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  modeBtnActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
  modeTxt: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  modeTxtActive: { color: C.textBright },
  profileSection: { marginTop: 14 },
  sectionLabel: { fontSize: 12, color: C.textMuted, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
  profileScroll: { flexDirection: "row" },
  profileChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bgCard, marginRight: 8,
  },
  profileDot: { width: 8, height: 8, borderRadius: 4 },
  profileChipTxt: { fontSize: 12, color: C.textDim, fontWeight: "500" },
  pyInfo: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 14, marginBottom: 4,
    padding: 10, borderRadius: C.radiusSm,
    backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.accent + "40",
  },
  pyInfoTxt: { fontSize: 12, color: C.accent, flex: 1 },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  editorActions: { flexDirection: "row", gap: 6 },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6 },
  iconBtnTxt: { fontSize: 12, color: C.textDim },
  editorWrap: {
    borderRadius: C.radius,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bgInput,
    minHeight: 160, marginTop: 4,
    overflow: "hidden",
  },
  editor: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: C.text,
    padding: 12,
    lineHeight: 19,
    minHeight: 160,
    textAlignVertical: "top",
  },
  runRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  runBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: C.radius,
    backgroundColor: C.primary,
  },
  runBtnDisabled: { opacity: 0.6 },
  runBtnTxt: { fontSize: 14, fontWeight: "700", color: C.textBright },
  pipBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: C.radius, borderWidth: 1,
    borderColor: C.accent + "60", backgroundColor: C.accentDim,
  },
  pipBtnTxt: { fontSize: 13, color: C.accent, fontWeight: "600" },
  consoleHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" },
  clearTxt: { fontSize: 11, color: C.textMuted },
  console: {
    borderRadius: C.radius, borderWidth: 1, borderColor: C.border,
    backgroundColor: "#060610", minHeight: 160, marginTop: 4,
  },
  consoleFeed: { padding: 10, maxHeight: 240 },
  consolePlaceholder: { fontSize: 12, color: C.textMuted, lineHeight: 18, fontStyle: "italic" },
  logLine: { flexDirection: "row", gap: 8, marginBottom: 3 },
  logTime: { fontSize: 10, color: C.textMuted, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginTop: 2 },
  logText: {
    flex: 1, fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 18,
  },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    backgroundColor: C.bgCard,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingHorizontal: 16, maxHeight: "60%",
    borderTopWidth: 1, borderTopColor: C.border,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: C.textBright, marginBottom: 14 },
  tplItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tplLabel: { flex: 1, fontSize: 14, color: C.text },
  pipModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  pipModalCard: { width: "100%", backgroundColor: C.bgCard, borderRadius: C.radiusLg, padding: 20, borderWidth: 1, borderColor: C.border },
  pipModalTitle: { fontSize: 18, fontWeight: "700", color: C.textBright, marginBottom: 6 },
  pipModalSub: { fontSize: 13, color: C.textMuted, marginBottom: 14 },
  pipInput: {
    backgroundColor: C.bgInput, borderRadius: C.radiusSm,
    borderWidth: 1, borderColor: C.border,
    color: C.text, padding: 12, fontSize: 14, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  pipBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  pipCancel: { flex: 1, paddingVertical: 12, borderRadius: C.radiusSm, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  pipCancelTxt: { color: C.textDim, fontWeight: "600" },
  pipInstall: { flex: 1, paddingVertical: 12, borderRadius: C.radiusSm, backgroundColor: C.accent, alignItems: "center" },
  pipInstallTxt: { color: C.bg, fontWeight: "700" },
});
