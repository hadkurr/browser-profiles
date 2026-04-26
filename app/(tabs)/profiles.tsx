import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfiles } from "@/context/ProfileContext";
import C from "@/constants/colors";
import { BrowserProfile, PROFILE_COLORS } from "@/types";

function fmtAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return "vừa xong";
  if (d < 3600000) return `${Math.floor(d / 60000)} phút trước`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} giờ trước`;
  return new Date(ts).toLocaleDateString("vi-VN");
}

interface CreateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string) => void;
}
function CreateModal({ visible, onClose, onConfirm }: CreateModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROFILE_COLORS[0]);

  function submit() {
    if (!name.trim()) return;
    onConfirm(name.trim(), color);
    setName("");
    setColor(PROFILE_COLORS[0]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={s.modalTitle}>Tạo profile mới</Text>
          <TextInput
            style={s.input}
            placeholder="Tên profile..."
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Text style={s.colorLabel}>Màu sắc</Text>
          <View style={s.colorRow}>
            {PROFILE_COLORS.map((c) => (
              <Pressable
                key={c}
                style={[s.colorDot, { backgroundColor: c }, color === c && s.colorSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
          <View style={s.modalActions}>
            <Pressable style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Hủy</Text>
            </Pressable>
            <Pressable
              style={[s.confirmBtn, !name.trim() && { opacity: 0.5 }]}
              onPress={submit}
              disabled={!name.trim()}
            >
              <Text style={s.confirmText}>Tạo</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ProfileRow({ profile, isActive, onPress, onLongPress, onSettings, onDelete, onOpenBrowser }: {
  profile: BrowserProfile;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onSettings: () => void;
  onDelete: () => void;
  onOpenBrowser: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.profileRow, isActive && { borderColor: profile.color + "60" }, { opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[s.avatar, { backgroundColor: profile.color + "20", borderColor: profile.color + "40" }]}>
        <Text style={[s.avatarText, { color: profile.color }]}>
          {profile.name.slice(0, 2).toUpperCase()}
        </Text>
        {isActive && <View style={[s.activeBadge, { backgroundColor: C.success }]} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={s.profileName} numberOfLines={1}>{profile.name}</Text>
          {profile.isPrivate && (
            <View style={s.privateBadge}>
              <Feather name="eye-off" size={9} color={C.textMuted} />
            </View>
          )}
        </View>
        <Text style={s.profileSub} numberOfLines={1}>
          {profile.fingerprint.platform} · {fmtAgo(profile.lastUsed)} · {profile.visitCount} lượt
        </Text>
      </View>
      <Pressable style={s.iconBtn} onPress={onOpenBrowser} hitSlop={8}>
        <Feather name="globe" size={17} color={C.primary} />
      </Pressable>
      <Pressable style={s.iconBtn} onPress={onSettings} hitSlop={8}>
        <Feather name="settings" size={17} color={C.textMuted} />
      </Pressable>
    </Pressable>
  );
}

export default function ProfilesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    profiles,
    activeProfileId,
    createProfile,
    deleteProfile,
    setActiveProfile,
    duplicateProfile,
  } = useProfiles();

  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleCreate(name: string, color: string) {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createProfile(name, color);
    setShowCreate(false);
  }

  async function handleDelete(p: BrowserProfile) {
    if (profiles.length === 1) {
      Alert.alert("Không thể xóa", "Phải có ít nhất 1 profile.");
      return;
    }
    Alert.alert("Xóa profile", `Xóa "${p.name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteProfile(p.id);
        },
      },
    ]);
  }

  function handleLongPress(p: BrowserProfile) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(p.name, "Chọn hành động", [
      { text: "Mở trình duyệt", onPress: () => { setActiveProfile(p.id); router.push(`/browser/${p.id}` as any); } },
      { text: "Nhân bản", onPress: async () => { await duplicateProfile(p.id); } },
      { text: "Xóa", style: "destructive", onPress: () => handleDelete(p) },
      { text: "Hủy", style: "cancel" },
    ]);
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Profiles</Text>
          <Text style={s.subtitle}>{profiles.length} profile · Dữ liệu tách biệt</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setShowCreate(true)}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={s.searchRow}>
        <Feather name="search" size={15} color={C.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Tìm kiếm profile..."
          placeholderTextColor={C.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Feather name="x" size={15} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 80 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <ProfileRow
            profile={item}
            isActive={item.id === activeProfileId}
            onPress={async () => {
              if (Platform.OS !== "web") await Haptics.selectionAsync();
              await setActiveProfile(item.id);
              router.push(`/browser/${item.id}` as any);
            }}
            onLongPress={() => handleLongPress(item)}
            onSettings={() => router.push(`/profile/${item.id}` as any)}
            onDelete={() => handleDelete(item)}
            onOpenBrowser={() => {
              setActiveProfile(item.id);
              router.push(`/browser/${item.id}` as any);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="users" size={36} color={C.textMuted} />
            <Text style={s.emptyText}>Không tìm thấy profile</Text>
          </View>
        }
      />

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onConfirm={handleCreate} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.textBright },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: C.primary, width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, backgroundColor: C.bgCard, borderRadius: C.radius, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: C.text },

  list: { paddingHorizontal: 16, paddingTop: 4 },
  profileRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgCard, borderRadius: C.radiusLg, padding: 12, gap: 12, borderWidth: 1, borderColor: C.border },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  activeBadge: { position: "absolute", bottom: 2, right: 2, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: C.bgCard },
  privateBadge: { backgroundColor: C.bgCardHover, borderRadius: 6, padding: 3, borderWidth: 1, borderColor: C.border },
  profileName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.text },
  profileSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  iconBtn: { padding: 6 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: C.bgCard, borderRadius: C.radiusLg, padding: 20, width: "85%", gap: 14, borderWidth: 1, borderColor: C.borderLight },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.textBright },
  input: { backgroundColor: C.bgInput, borderRadius: C.radius, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.border },
  colorLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textDim },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: C.text },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: C.bgCardHover, borderRadius: C.radius, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  cancelText: { fontFamily: "Inter_500Medium", fontSize: 14, color: C.textDim },
  confirmBtn: { flex: 1, backgroundColor: C.primary, borderRadius: C.radius, paddingVertical: 12, alignItems: "center" },
  confirmText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, color: C.textMuted },
});
