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

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, activateKey, user } = useAuth();
  const [step, setStep] = useState<"register" | "activate">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [key, setKey] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!username.trim() || username.trim().length < 3) {
      setError("Tên đăng nhập phải có ít nhất 3 ký tự");
      return;
    }
    if (!password || password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(username.trim(), password);
      setStep("activate");
    } catch (e: any) {
      setError(e.message ?? "Lỗi đăng ký");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate() {
    if (!key.trim() || key.trim().length < 10) {
      setError("Vui lòng nhập key hợp lệ");
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

  if (step === "activate") {
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
              <Feather name="key" size={32} color={C.primary} />
            </View>
            <Text style={s.appName}>Kích hoạt tài khoản</Text>
            <Text style={s.tagline}>Nhập key do Admin cung cấp để sử dụng</Text>
          </View>

          <View style={s.card}>
            <View style={s.successBox}>
              <Feather name="check-circle" size={16} color="#22c55e" />
              <Text style={s.successText}>Đăng ký thành công! Nhập key để tiếp tục.</Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color="#f87171" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={s.field}>
              <Text style={s.label}>Key kích hoạt (12 ký tự)</Text>
              <View style={s.inputRow}>
                <Feather name="key" size={16} color={C.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" }]}
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
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnText}>Kích hoạt</Text>
              )}
            </Pressable>

            <Text style={s.noteText}>
              Liên hệ Admin để nhận key kích hoạt
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
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
            <Feather name="user-plus" size={32} color={C.primary} />
          </View>
          <Text style={s.appName}>Tạo tài khoản</Text>
          <Text style={s.tagline}>Đăng ký miễn phí, cần key để kích hoạt</Text>
        </View>

        <View style={s.card}>
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
                placeholder="Ít nhất 3 ký tự"
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
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color={C.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Xác nhận mật khẩu</Text>
            <View style={s.inputRow}>
              <Feather name="lock" size={16} color={C.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPass}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />
            </View>
          </View>

          <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Đăng ký</Text>
            )}
          </Pressable>

          <Pressable style={s.link} onPress={() => router.back()}>
            <Text style={s.linkText}>Đã có tài khoản? <Text style={s.linkAccent}>Đăng nhập</Text></Text>
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
  appName: { fontFamily: "Inter_700Bold", fontSize: 22, color: C.text },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted, textAlign: "center" },
  card: { backgroundColor: C.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border, gap: 16 },
  successBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#22c55e18", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#22c55e30" },
  successText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: "#22c55e" },
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
  noteText: { fontFamily: "Inter_400Regular", fontSize: 12, color: C.textMuted, textAlign: "center", lineHeight: 18 },
});
