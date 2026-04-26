import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useProfiles } from "@/context/ProfileContext";
import { useSettings } from "@/context/SettingsContext";
import C from "@/constants/colors";

function Row({ icon, label, sub, right, onPress, danger }: {
  icon: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, onPress && { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[s.rowIcon, danger && { backgroundColor: "#3a1a1a" }]}>
        <Feather name={icon as any} size={16} color={danger ? "#f87171" : C.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.rowLabel, danger && { color: "#f87171" }]}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={danger ? "#f87171" : C.textMuted} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, clearProfileData } = useProfiles();
  const { user, logout } = useAuth();
  const { settings, setSetting } = useSettings();

  async function handleClearAll() {
    Alert.alert(
      "Xóa toàn bộ dữ liệu",
      "Lịch sử và bookmark của TẤT CẢ profile sẽ bị xóa vĩnh viễn. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web")
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            for (const p of profiles) {
              await clearProfileData(p.id);
            }
          },
        },
      ]
    );
  }

  async function handleClearSessions() {
    Alert.alert(
      "Xóa session lưu trữ",
      "Dữ liệu localStorage/sessionStorage của tất cả profile sẽ bị xóa. Các tài khoản đã đăng nhập sẽ bị đăng xuất. Tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web")
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const keys = await AsyncStorage.getAllKeys();
            const sessionKeys = keys.filter((k) => k.startsWith("__bpm_storage_"));
            await AsyncStorage.multiRemove(sessionKeys);
          },
        },
      ]
    );
  }

  function handleLogout() {
    Alert.alert(
      "Đăng xuất",
      `Bạn có chắc muốn đăng xuất khỏi tài khoản "${user?.username}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web")
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
          },
        },
      ]
    );
  }

  const totalStorage = profiles.reduce(
    (s, p) => s + p.historyEntries.length + p.bookmarks.length,
    0
  );

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.title}>Cài đặt</Text>

      {user && (
        <View style={s.accountCard}>
          <View style={s.accountAvatar}>
            <Feather name={user.isAdmin ? "shield" : "user"} size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>{user.username}</Text>
            <Text style={s.accountRole}>{user.isAdmin ? "Quản trị viên" : "Người dùng"}</Text>
          </View>
          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={15} color="#f87171" />
            <Text style={s.logoutBtnText}>Đăng xuất</Text>
          </Pressable>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Tổng quan</Text>
        <View style={s.card}>
          <Row icon="users" label="Tổng số profile" right={<Text style={s.valueText}>{profiles.length}</Text>} />
          <View style={s.divider} />
          <Row icon="database" label="Mục lưu trữ (lịch sử + bookmark)" right={<Text style={s.valueText}>{totalStorage}</Text>} />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Fingerprint & Bảo mật</Text>
        <View style={s.card}>
          <Row
            icon="shield"
            label="Fingerprint riêng cho mỗi profile"
            sub="UserAgent, Platform, WebGL, Canvas noise"
            right={
              <Switch
                value={settings.fingerprintEnabled}
                onValueChange={(v) => setSetting("fingerprintEnabled", v)}
                trackColor={{ false: C.border, true: C.primary + "60" }}
                thumbColor={settings.fingerprintEnabled ? C.primary : C.textMuted}
              />
            }
          />
          <View style={s.divider} />
          <Row
            icon="eye-off"
            label="Cô lập localStorage / sessionStorage"
            sub="Dữ liệu mỗi profile được lưu riêng"
            right={
              <Switch
                value={settings.storageIsolationEnabled}
                onValueChange={(v) => setSetting("storageIsolationEnabled", v)}
                trackColor={{ false: C.border, true: C.primary + "60" }}
                thumbColor={settings.storageIsolationEnabled ? C.primary : C.textMuted}
              />
            }
          />
        </View>
        <Text style={s.settingNote}>
          {settings.fingerprintEnabled
            ? "Mỗi profile dùng UserAgent và fingerprint riêng biệt để tránh bị tracking."
            : "Tắt fingerprint: tất cả profile dùng UserAgent mặc định của thiết bị."}
        </Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Dữ liệu & Bộ nhớ</Text>
        <View style={s.card}>
          <Row
            icon="trash-2"
            label="Xóa lịch sử & bookmark tất cả profile"
            sub="Không thể hoàn tác"
            onPress={handleClearAll}
          />
          <View style={s.divider} />
          <Row
            icon="log-out"
            label="Xóa session đăng nhập tất cả profile"
            sub="Các tài khoản sẽ bị đăng xuất"
            onPress={handleClearSessions}
          />
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Thông tin</Text>
        <View style={s.card}>
          <Row icon="info" label="Phiên bản ứng dụng" right={<Text style={s.valueText}>2.0.0</Text>} />
          <View style={s.divider} />
          <Row icon="cpu" label="Engine" right={<Text style={s.valueText}>Expo SDK 54 + react-native-webview</Text>} />
          <View style={s.divider} />
          <Row
            icon="alert-triangle"
            label="Lưu ý về cookie HTTP"
            sub="HTTP-only cookie do server set vẫn dùng cookie jar chung của OS. localStorage/sessionStorage được cô lập hoàn toàn."
          />
        </View>
      </View>

      <View style={s.section}>
        <View style={s.card}>
          <Row
            icon="log-out"
            label="Đăng xuất"
            sub={user ? `Đăng xuất khỏi tài khoản ${user.username}` : ""}
            onPress={handleLogout}
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.textBright },

  accountCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.bgCard, borderRadius: C.radiusLg,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  accountAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center",
  },
  accountName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.textBright },
  accountRole: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#3a1a1a", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  logoutBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#f87171" },

  section: { gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.textMuted, paddingLeft: 2 },
  settingNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, paddingHorizontal: 4, lineHeight: 16 },

  card: { backgroundColor: C.bgCard, borderRadius: C.radiusLg, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, lineHeight: 16 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 58 },

  valueText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textDim },

  footerNote: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, flex: 1 },
});
