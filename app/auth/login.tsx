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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message ?? "Lỗi đăng nhập");
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
            <Feather name="globe" size={36} color={C.primary} />
          </View>
          <Text style={s.appName}>Browser Profiles</Text>
          <Text style={s.tagline}>Quản lý nhiều tài khoản dễ dàng</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Đăng nhập</Text>

          {error ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color="#f87171" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.field}>
            <Text style={s.label}>Tên đăng nhập</Text>
            <View style={s.inputRow}>
              <Feather name="user" size={16} color={C.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Mật khẩu</Text>
            <View style={s.inputRow}>
              <Feather name="lock" size={16} color={C.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={C.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Đăng nhập</Text>
            )}
          </Pressable>

          <Pressable style={s.link} onPress={() => router.push("/auth/register")}>
            <Text style={s.linkText}>Chưa có tài khoản? <Text style={s.linkAccent}>Đăng ký</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "center" },
  logoArea: { alignItems: "center", marginBottom: 32, gap: 8 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  appName: { fontFamily: "Inter_700Bold", fontSize: 24, color: C.text },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  card: { backgroundColor: C.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, gap: 16 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: C.text, marginBottom: 4 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8717120", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#f8717140" },
  errorText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: "#f87171" },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, color: C.textDim },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.bgInput, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.border, gap: 8 },
  inputIcon: { marginRight: 2 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: C.text },
  btn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  link: { alignItems: "center", paddingVertical: 4 },
  linkText: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted },
  linkAccent: { fontFamily: "Inter_600SemiBold", color: C.primary },
});
