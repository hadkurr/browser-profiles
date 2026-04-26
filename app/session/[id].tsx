import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import C from "@/constants/colors";
import { useProfiles } from "@/context/ProfileContext";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles, removeBookmark } = useProfiles();

  const profile = profiles.find((p) => p.id === id);
  if (!profile) return null;

  function fmtDate(ts: number) {
    return new Date(ts).toLocaleString("vi-VN");
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={C.primary} />
        </Pressable>
        <View>
          <Text style={s.title}>Lịch sử phiên</Text>
          <Text style={s.sub}>{profile.name} · {profile.historyEntries.length} mục</Text>
        </View>
      </View>

      <FlatList
        data={profile.historyEntries}
        keyExtractor={(h) => h.id}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="clock" size={34} color={C.textMuted} />
            <Text style={s.emptyText}>Chưa có lịch sử nào</Text>
            <Text style={s.emptySub}>Mở trình duyệt để bắt đầu duyệt web</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.row, { borderLeftColor: profile.color, borderLeftWidth: 3 }]}>
            <Feather name="globe" size={14} color={profile.color} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{item.title || item.url}</Text>
              <Text style={s.rowUrl} numberOfLines={1}>{item.url}</Text>
              <Text style={s.rowTime}>{fmtDate(item.visitedAt)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: C.textBright },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, marginTop: 2 },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  row: { backgroundColor: C.bgCard, borderRadius: C.radius, padding: 12, flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: 1, borderColor: C.border, borderLeftWidth: 3 },
  rowTitle: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.text },
  rowUrl: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  rowTime: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.textMuted },

  emptyBox: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: C.textDim },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
});
