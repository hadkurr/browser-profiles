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

import { useProfiles } from "@/context/ProfileContext";
import C from "@/constants/colors";

function Row({ icon, label, sub, right, onPress }: {
  icon: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, onPress && { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={s.rowIcon}>
        <Feather name={icon as any} size={16} color={C.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={C.textMuted} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, clearProfileData } = useProfiles();
  const [confirmClear, setConfirmClear] = useState(false);

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
              <View style={[s.badge, { backgroundColor: C.successDim }]}>
                <Text style={[s.badgeText, { color: C.success }]}>Bật</Text>
              </View>
            }
          />
          <View style={s.divider} />
          <Row
            icon="eye-off"
            label="Cô lập localStorage / sessionStorage"
            sub="Dữ liệu mỗi profile được lưu riêng"
            right={
              <View style={[s.badge, { backgroundColor: C.successDim }]}>
                <Text style={[s.badgeText, { color: C.success }]}>Bật</Text>
              </View>
            }
          />
        </View>
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

      <View style={[s.footerNote, { marginTop: 8 }]}>
        <Feather name="lock" size={12} color={C.textMuted} />
        <Text style={s.footerText}>
          Dữ liệu được lưu cục bộ · Không có cloud sync · Không cần đăng nhập
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, gap: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.textBright },

  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textMuted, paddingLeft: 2 },

  card: { backgroundColor: C.bgCard, borderRadius: C.radiusLg, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.text },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, lineHeight: 16 },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 58 },

  valueText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textDim },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 11 },

  footerNote: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, flex: 1 },
});
