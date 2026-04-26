import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import C from "@/constants/colors";

export default function ActivateScreen() {
  const insets = useSafeAreaInsets();
  const { activateKey, logout, user } = useAuth();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleActivate() {
    if (!key.trim() || key.trim().length < 10) {
      setError("Vui lòng nhập key hợp lệ (12 ký tự)");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await activateKey(key.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Key không hợp lệ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Feather name="key" size={36} color={C.primary} />
          </View>
          <Text style={s.title}>Kích hoạt tài khoản</Text>
          {user && <Text style={s.username}>Xin chào, <Text style={{ color: C.primary }}>{user.username}</Text></Text>}
          <Text style={s.desc}>Tài khoản của bạn chưa được kích hoạt.{"\n"}Nhập key từ Admin để sử dụng đầy đủ tính năng.</Text>
        </View>

        <View style={s.card}>
          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color="#f87171" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.field}>
            <Text style={s.label}>Key kích hoạt (12 ký tự)</Text>
            <View style={s.inputRow}>
              <Feather name="key" size={16} color={C.textMuted} />
              <TextInput
                style={[s.input, { fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase", textAlign: "center" }]}
                value={key}
                onChangeText={setKey}
                placeholder="XXXXXXXXXXXX"
                placeholderTextColor={C.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="go"
                onSubmitEditing={handleActivate}
              />
            </View>
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleActivate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Kích hoạt ngay</Text>}
          </Pressable>

          <View style={s.divider} />

          <Pressable style={s.logoutBtn} onPress={logout}>
            <Feather name="log-out" size={14} color={C.textMuted} />
            <Text style={s.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 32, gap: 10 },
  logoBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  username: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textDim },
  desc: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: C.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8717120", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#f8717140" },
  errorText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: "#f87171" },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textDim },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 18, color: C.text },
  btn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  divider: { height: 1, backgroundColor: C.border },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 4 },
  logoutText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
});
