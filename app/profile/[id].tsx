import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";
import { useProfiles } from "@/context/ProfileContext";
import { generateFingerprint, PROFILE_COLORS } from "@/types";

type Tab = "overview" | "history" | "bookmarks";

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profiles,
    updateProfile,
    renameProfile,
    deleteProfile,
    clearHistory,
    removeBookmark,
    clearProfileData,
  } = useProfiles();

  const profile = profiles.find((p) => p.id === id);
  const [tab, setTab] = useState<Tab>("overview");
  const [editName, setEditName] = useState(profile?.name ?? "");
  const [editingName, setEditingName] = useState(false);

  useLayoutEffect(() => {
    if (!profile) router.back();
  }, [profile]);

  if (!profile) return null;

  async function handleSaveName() {
    if (!editName.trim()) return;
    await renameProfile(id!, editName.trim());
    setEditingName(false);
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleRotateFingerprint() {
    Alert.alert("Xoay Fingerprint", "Tạo fingerprint ngẫu nhiên mới cho profile này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xoay",
        onPress: async () => {
          await updateProfile(id!, { fingerprint: generateFingerprint() });
          if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }

  async function handleDelete() {
    if (profiles.length === 1) {
      Alert.alert("Không thể xóa", "Phải có ít nhất 1 profile.");
      return;
    }
    Alert.alert("Xóa profile", `Xóa "${profile.name}"? Hành động này không thể hoàn tác.`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteProfile(id!);
          router.back();
        },
      },
    ]);
  }

  function FpRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={pf.fpRow}>
        <Text style={pf.fpLabel}>{label}</Text>
        <Text style={pf.fpValue} numberOfLines={2}>{value}</Text>
      </View>
    );
  }

  function renderOverview() {
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
        <View style={pf.section}>
          <Text style={pf.sectionTitle}>Thông tin</Text>
          <View style={pf.card}>
            <View style={pf.row}>
              <Text style={pf.label}>Tên profile</Text>
              {editingName ? (
                <View style={pf.nameEditRow}>
                  <TextInput
                    style={pf.nameInput}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <Pressable style={pf.saveBtn} onPress={handleSaveName}>
                    <Text style={pf.saveBtnText}>Lưu</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={pf.nameRow} onPress={() => setEditingName(true)}>
                  <Text style={pf.nameText}>{profile.name}</Text>
                  <Feather name="edit-2" size={13} color={C.primary} />
                </Pressable>
              )}
            </View>
            <View style={pf.divider} />
            <View style={pf.row}>
              <Text style={pf.label}>Màu sắc</Text>
              <View style={pf.colorRow}>
                {PROFILE_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[pf.colorDot, { backgroundColor: c }, profile.color === c && pf.colorSelected]}
                    onPress={() => updateProfile(id!, { color: c })}
                  />
                ))}
              </View>
            </View>
            <View style={pf.divider} />
            <View style={pf.rowBetween}>
              <Text style={pf.label}>Lượt truy cập</Text>
              <Text style={pf.value}>{profile.visitCount}</Text>
            </View>
          </View>
        </View>

        <View style={pf.section}>
          <Text style={pf.sectionTitle}>Fingerprint</Text>
          <View style={pf.card}>
            <FpRow label="User-Agent" value={profile.fingerprint.userAgent} />
            <View style={pf.divider} />
            <FpRow label="Platform" value={profile.fingerprint.platform} />
            <View style={pf.divider} />
            <FpRow label="Ngôn ngữ" value={profile.fingerprint.language} />
            <View style={pf.divider} />
            <FpRow label="Màn hình" value={`${profile.fingerprint.screenWidth}x${profile.fingerprint.screenHeight}`} />
            <View style={pf.divider} />
            <FpRow label="WebGL Vendor" value={profile.fingerprint.webglVendor} />
            <View style={pf.divider} />
            <FpRow label="WebGL Renderer" value={profile.fingerprint.webglRenderer} />
            <View style={pf.divider} />
            <FpRow label="Canvas Noise" value={profile.fingerprint.canvasNoise ? "Bật" : "Tắt"} />
            <View style={pf.divider} />
            <Pressable style={pf.rotateBtn} onPress={handleRotateFingerprint}>
              <Feather name="refresh-cw" size={14} color={C.primary} />
              <Text style={pf.rotateBtnText}>Xoay fingerprint ngẫu nhiên</Text>
            </Pressable>
          </View>
        </View>

        <View style={pf.section}>
          <Text style={pf.sectionTitle}>Quyền riêng tư</Text>
          <View style={pf.card}>
            {([
              { key: "isPrivate", label: "Chế độ riêng tư", sub: "Không lưu lịch sử" },
              { key: "cookiesEnabled", label: "Cookie", sub: "Cho phép ghi cookie" },
              { key: "javascriptEnabled", label: "JavaScript", sub: "Cho phép chạy JS" },
            ] as const).map(({ key, label, sub }, i) => (
              <React.Fragment key={key}>
                {i > 0 && <View style={pf.divider} />}
                <View style={pf.rowBetween}>
                  <View style={{ gap: 2 }}>
                    <Text style={pf.label}>{label}</Text>
                    <Text style={pf.sublabel}>{sub}</Text>
                  </View>
                  <Switch
                    value={!!profile[key]}
                    onValueChange={(v) => updateProfile(id!, { [key]: v })}
                    trackColor={{ false: C.border, true: C.primary + "80" }}
                    thumbColor={profile[key] ? C.primary : C.textMuted}
                  />
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={pf.section}>
          <Text style={pf.sectionTitle}>Nguy hiểm</Text>
          <View style={pf.card}>
            <Pressable style={pf.dangerRow} onPress={() => { clearHistory(id!); }}>
              <Feather name="clock" size={15} color={C.warning} />
              <Text style={[pf.dangerText, { color: C.warning }]}>Xóa toàn bộ lịch sử</Text>
            </Pressable>
            <View style={pf.divider} />
            <Pressable style={pf.dangerRow} onPress={() => { clearProfileData(id!); }}>
              <Feather name="database" size={15} color={C.warning} />
              <Text style={[pf.dangerText, { color: C.warning }]}>Xóa toàn bộ dữ liệu</Text>
            </Pressable>
            <View style={pf.divider} />
            <Pressable style={pf.dangerRow} onPress={handleDelete}>
              <Feather name="trash-2" size={15} color={C.error} />
              <Text style={[pf.dangerText, { color: C.error }]}>Xóa profile này</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderHistory() {
    return (
      <FlatList
        data={profile.historyEntries}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ gap: 6, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={pf.emptyBox}>
            <Feather name="clock" size={28} color={C.textMuted} />
            <Text style={pf.emptyText}>Chưa có lịch sử nào</Text>
          </View>
        }
        ListHeaderComponent={
          profile.historyEntries.length > 0 ? (
            <Pressable style={pf.clearAllBtn} onPress={() => clearHistory(id!)}>
              <Feather name="trash-2" size={13} color={C.error} />
              <Text style={pf.clearAllText}>Xóa tất cả</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={pf.listRow}>
            <Feather name="globe" size={14} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={pf.listTitle} numberOfLines={1}>{item.title || item.url}</Text>
              <Text style={pf.listSub} numberOfLines={1}>{item.url}</Text>
            </View>
            <Text style={pf.listTime}>{new Date(item.visitedAt).toLocaleDateString("vi-VN")}</Text>
          </View>
        )}
      />
    );
  }

  function renderBookmarks() {
    return (
      <FlatList
        data={profile.bookmarks}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ gap: 6, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={pf.emptyBox}>
            <Feather name="bookmark" size={28} color={C.textMuted} />
            <Text style={pf.emptyText}>Chưa có bookmark nào</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={pf.listRow}>
            <Feather name="bookmark" size={14} color={C.warning} />
            <View style={{ flex: 1 }}>
              <Text style={pf.listTitle} numberOfLines={1}>{item.title || item.url}</Text>
              <Text style={pf.listSub} numberOfLines={1}>{item.url}</Text>
            </View>
            <Pressable onPress={() => removeBookmark(id!, item.id)} hitSlop={8}>
              <Feather name="x" size={15} color={C.textMuted} />
            </Pressable>
          </View>
        )}
      />
    );
  }

  return (
    <View style={[pf.container, { paddingBottom: insets.bottom }]}>
      <View style={pf.profileHeader}>
        <View style={[pf.avatar, { backgroundColor: profile.color + "20", borderColor: profile.color + "50" }]}>
          <Text style={[pf.avatarText, { color: profile.color }]}>
            {profile.name.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ gap: 3 }}>
          <Text style={pf.profileName}>{profile.name}</Text>
          <Text style={pf.profileSub}>{profile.fingerprint.platform} · {profile.fingerprint.language}</Text>
        </View>
      </View>

      <View style={pf.tabs}>
        {(["overview", "history", "bookmarks"] as Tab[]).map((t) => (
          <Pressable key={t} style={[pf.tabBtn, tab === t && { borderBottomColor: C.primary }]} onPress={() => setTab(t)}>
            <Text style={[pf.tabLabel, tab === t && { color: C.primary }]}>
              {t === "overview" ? "Tổng quan" : t === "history" ? "Lịch sử" : "Bookmark"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {tab === "overview" && renderOverview()}
        {tab === "history" && renderHistory()}
        {tab === "bookmarks" && renderBookmarks()}
      </View>
    </View>
  );
}

const pf = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  avatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  profileName: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.textBright },
  profileSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },

  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textMuted },

  section: { gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.textMuted, paddingLeft: 2, marginTop: 16 },
  card: { backgroundColor: C.bgCard, borderRadius: C.radiusLg, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  row: { padding: 14, gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  divider: { height: 1, backgroundColor: C.border },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textDim },
  sublabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  value: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },

  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nameText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.textBright },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  nameInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, backgroundColor: C.bgInput, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  saveBtn: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorSelected: { borderWidth: 3, borderColor: C.text },

  fpRow: { padding: 12, gap: 4 },
  fpLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  fpValue: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.text, lineHeight: 18 },
  rotateBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  rotateBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.primary },

  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  dangerText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  listRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, borderRadius: C.radius, padding: 12, gap: 10, borderWidth: 1, borderColor: C.border },
  listTitle: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.text },
  listSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, marginTop: 2 },
  listTime: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.textMuted },
  clearAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, alignSelf: "flex-end" },
  clearAllText: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.error },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
});
