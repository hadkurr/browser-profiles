import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfiles } from "@/context/ProfileContext";
import C from "@/constants/colors";

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={[s.statCard, { borderColor: color + "30" }]}>
      <View style={[s.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ActivityItem({ label, time, color }: { label: string; time: string; color: string }) {
  return (
    <View style={s.activityRow}>
      <View style={[s.activityDot, { backgroundColor: color }]} />
      <Text style={s.activityLabel} numberOfLines={1}>{label}</Text>
      <Text style={s.activityTime}>{time}</Text>
    </View>
  );
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ`;
  return d.toLocaleDateString("vi-VN");
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profiles, activeProfile, activeProfileId, setActiveProfile } = useProfiles();

  const stats = useMemo(() => {
    const totalVisits = profiles.reduce((s, p) => s + p.visitCount, 0);
    const totalBookmarks = profiles.reduce((s, p) => s + p.bookmarks.length, 0);
    const totalHistory = profiles.reduce((s, p) => s + p.historyEntries.length, 0);
    return { totalVisits, totalBookmarks, totalHistory };
  }, [profiles]);

  const recentActivity = useMemo(() => {
    const items: { label: string; time: string; color: string }[] = [];
    profiles.forEach((p) => {
      p.historyEntries.slice(0, 3).forEach((h) => {
        items.push({ label: `${p.name}: ${h.title || h.url}`, time: fmtTime(h.visitedAt), color: p.color });
      });
    });
    return items.sort((a) => -1).slice(0, 8);
  }, [profiles]);

  async function handleOpenBrowser() {
    if (!activeProfileId) return;
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/browser/${activeProfileId}` as any);
  }

  async function handleOpenMulti() {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/browser/multi" as any);
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Xin chào 👋</Text>
          <Text style={s.title}>Browser Profile Manager</Text>
        </View>
        <View style={[s.versionBadge]}>
          <Text style={s.versionText}>v2</Text>
        </View>
      </View>

      <View style={s.statsRow}>
        <StatCard label="Profiles" value={String(profiles.length)} icon="users" color={C.primary} />
        <StatCard label="Lượt truy cập" value={String(stats.totalVisits)} icon="globe" color={C.success} />
        <StatCard label="Bookmark" value={String(stats.totalBookmarks)} icon="bookmark" color={C.warning} />
      </View>

      {activeProfile && (
        <View style={s.activeCard}>
          <View style={s.activeCardHeader}>
            <View style={[s.activeDot, { backgroundColor: activeProfile.color }]} />
            <Text style={s.activeCardTitle}>Profile đang dùng</Text>
          </View>
          <Text style={s.activeProfileName}>{activeProfile.name}</Text>
          <Text style={s.activeProfileSub}>
            UA: {activeProfile.fingerprint.userAgent.slice(0, 60)}...
          </Text>
          <View style={s.activeActions}>
            <Pressable
              style={({ pressed }) => [s.primaryBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleOpenBrowser}
            >
              <Feather name="globe" size={15} color="#fff" />
              <Text style={s.primaryBtnText}>Mở trình duyệt</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleOpenMulti}
            >
              <Feather name="grid" size={15} color={C.primary} />
              <Text style={s.secondaryBtnText}>Multi Browser</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Truy cập nhanh</Text>
        <View style={s.quickGrid}>
          {profiles.slice(0, 6).map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [
                s.quickCard,
                activeProfileId === p.id && { borderColor: p.color },
                { opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={async () => {
                if (Platform.OS !== "web") await Haptics.selectionAsync();
                await setActiveProfile(p.id);
                router.push(`/browser/${p.id}` as any);
              }}
            >
              <View style={[s.quickDot, { backgroundColor: p.color }]} />
              <Text style={s.quickName} numberOfLines={1}>{p.name}</Text>
              <Text style={s.quickVisits}>{p.visitCount} lượt</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Hoạt động gần đây</Text>
        {recentActivity.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="clock" size={28} color={C.textMuted} />
            <Text style={s.emptyText}>Chưa có hoạt động nào</Text>
          </View>
        ) : (
          <View style={s.activityList}>
            {recentActivity.map((a, i) => (
              <ActivityItem key={i} {...a} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, gap: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 13, color: C.textMuted },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.textBright, marginTop: 2 },
  versionBadge: { backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.primary + "40" },
  versionText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: C.primary },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: C.bgCard, borderRadius: C.radius, padding: 14, borderWidth: 1, alignItems: "center", gap: 6 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.textBright },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, textAlign: "center" },

  activeCard: { backgroundColor: C.bgCard, borderRadius: C.radiusLg, padding: 16, borderWidth: 1, borderColor: C.borderLight, gap: 8 },
  activeCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeCardTitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.textMuted },
  activeProfileName: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.textBright },
  activeProfileSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, lineHeight: 16 },
  activeActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  primaryBtn: { flex: 1, backgroundColor: C.primary, borderRadius: C.radius, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  secondaryBtn: { flex: 1, backgroundColor: C.primaryDim, borderRadius: C.radius, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: C.primary + "50" },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.primary },

  section: { gap: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: C.text },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { width: "30%", backgroundColor: C.bgCard, borderRadius: C.radius, padding: 12, borderWidth: 1, borderColor: C.border, gap: 6, alignItems: "center" },
  quickDot: { width: 10, height: 10, borderRadius: 5 },
  quickName: { fontFamily: "Inter_500Medium", fontSize: 12, color: C.text, textAlign: "center" },
  quickVisits: { fontFamily: "Inter_400Regular", fontSize: 10, color: C.textMuted },

  activityList: { backgroundColor: C.bgCard, borderRadius: C.radius, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  activityRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3 },
  activityLabel: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: C.textDim },
  activityTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },

  emptyBox: { backgroundColor: C.bgCard, borderRadius: C.radius, padding: 32, alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
});
