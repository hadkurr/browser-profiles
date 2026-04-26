import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import C from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/utils/apiUrl";

interface KeyRecord {
  id: string;
  key: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
  note: string;
}

interface UserRecord {
  id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  activatedKey: string | null;
  createdAt: string;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"keys" | "users">("keys");
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState("");
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  async function apiFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any).error ?? "Lỗi");
    return data;
  }

  const loadKeys = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/admin/keys");
      setKeys((data.keys as KeyRecord[]).reverse());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/admin/users");
      setUsers((data.users as UserRecord[]).reverse());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (tab === "keys") loadKeys();
    else loadUsers();
  }, [tab]);

  async function generateKeys() {
    const n = Math.min(Math.max(1, parseInt(count) || 1), 20);
    setGenerating(true);
    setError("");
    try {
      await apiFetch("/admin/keys", { method: "POST", body: JSON.stringify({ count: n, note: note.trim() }) });
      setNote("");
      setCount("1");
      await loadKeys();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteKey(key: string) {
    try {
      await apiFetch(`/admin/keys/${key}`, { method: "DELETE" });
      await loadKeys();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function copyKey(key: string) {
    await Clipboard.setStringAsync(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }

  if (!user?.isAdmin) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.center}>
          <Feather name="lock" size={48} color={C.textMuted} />
          <Text style={s.noAccessText}>Chỉ Admin mới truy cập được</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Feather name="shield" size={18} color={C.primary} />
        <Text style={s.title}>Admin Panel</Text>
        <View style={s.adminBadge}>
          <Text style={s.adminBadgeTxt}>ADMIN</Text>
        </View>
      </View>

      <View style={s.tabRow}>
        <Pressable style={[s.tabBtn, tab === "keys" && s.tabBtnActive]} onPress={() => setTab("keys")}>
          <Feather name="key" size={14} color={tab === "keys" ? C.primary : C.textMuted} />
          <Text style={[s.tabBtnTxt, tab === "keys" && s.tabBtnTxtActive]}>Keys ({keys.length})</Text>
        </Pressable>
        <Pressable style={[s.tabBtn, tab === "users" && s.tabBtnActive]} onPress={() => setTab("users")}>
          <Feather name="users" size={14} color={tab === "users" ? C.primary : C.textMuted} />
          <Text style={[s.tabBtnTxt, tab === "users" && s.tabBtnTxtActive]}>Users ({users.length})</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={s.errorBar}>
          <Feather name="alert-circle" size={13} color="#f87171" />
          <Text style={s.errorTxt}>{error}</Text>
        </View>
      ) : null}

      {tab === "keys" ? (
        <>
          <View style={s.genBox}>
            <Text style={s.genTitle}>Tạo Key mới</Text>
            <View style={s.genRow}>
              <TextInput
                style={[s.genInput, { flex: 2 }]}
                value={note}
                onChangeText={setNote}
                placeholder="Ghi chú (tuỳ chọn)"
                placeholderTextColor={C.textMuted}
              />
              <TextInput
                style={[s.genInput, { width: 60, textAlign: "center" }]}
                value={count}
                onChangeText={(v) => setCount(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                maxLength={2}
                placeholder="SL"
                placeholderTextColor={C.textMuted}
              />
              <Pressable style={[s.genBtn, generating && s.genBtnDisabled]} onPress={generateKeys} disabled={generating}>
                {generating ? <ActivityIndicator color="#fff" size="small" /> : <><Feather name="plus" size={14} color="#fff" /><Text style={s.genBtnTxt}>Tạo</Text></>}
              </Pressable>
            </View>
          </View>

          <FlatList
            data={keys}
            keyExtractor={(k) => k.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadKeys} tintColor={C.primary} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            renderItem={({ item }) => (
              <View style={[s.keyRow, item.usedBy ? s.keyRowUsed : s.keyRowFree]}>
                <View style={s.keyMain}>
                  <Text style={[s.keyText, item.usedBy && { color: C.textMuted }]}>{item.key}</Text>
                  {item.note ? <Text style={s.keyNote}>{item.note}</Text> : null}
                  <Text style={s.keyDate}>{item.usedBy ? `Đã dùng: ${item.usedAt?.slice(0,10)}` : `Tạo: ${item.createdAt.slice(0,10)}`}</Text>
                </View>
                <View style={s.keyActions}>
                  <View style={[s.keyStatus, item.usedBy ? s.keyStatusUsed : s.keyStatusFree]}>
                    <Text style={[s.keyStatusTxt, item.usedBy ? { color: "#f87171" } : { color: "#22c55e" }]}>
                      {item.usedBy ? "Đã dùng" : "Còn trống"}
                    </Text>
                  </View>
                  {!item.usedBy && (
                    <Pressable style={s.iconBtn} onPress={() => copyKey(item.key)}>
                      <Feather name={copiedKey === item.key ? "check" : "copy"} size={15} color={copiedKey === item.key ? "#22c55e" : C.textMuted} />
                    </Pressable>
                  )}
                  <Pressable style={s.iconBtn} onPress={() => deleteKey(item.key)}>
                    <Feather name="trash-2" size={15} color="#f87171" />
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={!loading ? <View style={s.empty}><Text style={s.emptyTxt}>Chưa có key nào</Text></View> : null}
          />
        </>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} tintColor={C.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => (
            <View style={s.userRow}>
              <View style={[s.userAvatar, { backgroundColor: item.isAdmin ? C.primary + "30" : C.primaryDim }]}>
                <Feather name={item.isAdmin ? "shield" : "user"} size={16} color={item.isAdmin ? C.primary : C.textMuted} />
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{item.username}</Text>
                <Text style={s.userDate}>Đăng ký: {item.createdAt.slice(0, 10)}</Text>
              </View>
              <View style={s.userBadges}>
                {item.isAdmin && <View style={s.badgeAdmin}><Text style={s.badgeTxt}>Admin</Text></View>}
                <View style={[s.badge, item.isActive ? s.badgeActive : s.badgeInactive]}>
                  <Text style={[s.badgeTxt, item.isActive ? { color: "#22c55e" } : { color: "#f87171" }]}>
                    {item.isActive ? "Active" : "Chờ key"}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={!loading ? <View style={s.empty}><Text style={s.emptyTxt}>Chưa có user nào</Text></View> : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAccessText: { fontFamily: "Inter_500Medium", fontSize: 15, color: C.textMuted },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18, color: C.text },
  adminBadge: { backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  adminBadgeTxt: { fontFamily: "Inter_700Bold", fontSize: 10, color: C.primary, letterSpacing: 1 },
  tabRow: { flexDirection: "row", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 1, borderColor: "transparent" },
  tabBtnActive: { borderColor: C.primary + "60", backgroundColor: C.primaryDim },
  tabBtnTxt: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textMuted },
  tabBtnTxtActive: { color: C.primary },
  errorBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f8717115", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f8717125" },
  errorTxt: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: "#f87171" },
  genBox: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  genTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: C.textDim },
  genRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  genInput: { backgroundColor: C.bgInput, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.border },
  genBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  genBtnDisabled: { opacity: 0.5 },
  genBtnTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  keyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  keyRowFree: { borderLeftWidth: 3, borderLeftColor: "#22c55e40" },
  keyRowUsed: { borderLeftWidth: 3, borderLeftColor: "#f8717140" },
  keyMain: { flex: 1, gap: 2 },
  keyText: { fontFamily: "Inter_700Bold", fontSize: 15, color: C.text, letterSpacing: 1.5 },
  keyNote: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  keyDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted },
  keyActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  keyStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  keyStatusFree: { backgroundColor: "#22c55e18" },
  keyStatusUsed: { backgroundColor: "#f8717118" },
  keyStatusTxt: { fontFamily: "Inter_500Medium", fontSize: 11 },
  iconBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: C.bgInput },
  empty: { padding: 32, alignItems: "center" },
  emptyTxt: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  userRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: C.text },
  userDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted },
  userBadges: { flexDirection: "row", gap: 6, alignItems: "center" },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAdmin: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.primaryDim },
  badgeActive: { backgroundColor: "#22c55e18" },
  badgeInactive: { backgroundColor: "#f8717118" },
  badgeTxt: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: C.primary },
});
