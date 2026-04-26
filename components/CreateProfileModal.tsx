import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PROFILE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

const PROFILE_ICONS = [
  { key: "person", label: "person" as const },
  { key: "briefcase", label: "briefcase" as const },
  { key: "school", label: "school" as const },
  { key: "home", label: "home" as const },
  { key: "game-controller", label: "game-controller" as const },
  { key: "heart", label: "heart" as const },
  { key: "star", label: "star" as const },
  { key: "rocket", label: "rocket" as const },
  { key: "cafe", label: "cafe" as const },
  { key: "musical-notes", label: "musical-notes" as const },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, color: string, icon: string) => void;
  initialName?: string;
  initialColor?: string;
  initialIcon?: string;
  title?: string;
}

export function CreateProfileModal({
  visible,
  onClose,
  onConfirm,
  initialName = "",
  initialColor = "#3b82f6",
  initialIcon = "person",
  title = "Tạo profile mới",
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const inputRef = useRef<TextInput>(null);

  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setSelectedColor(initialColor);
      setSelectedIcon(initialIcon);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  function handleConfirm() {
    if (!name.trim()) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onConfirm(name.trim(), selectedColor, selectedIcon);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kvContainer}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {title}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.previewContainer}>
            <View
              style={[
                styles.previewAvatar,
                { backgroundColor: selectedColor, borderRadius: 36 },
              ]}
            >
              <Ionicons name={(selectedIcon as any) || "person"} size={32} color="#fff" />
            </View>
            <Text style={[styles.previewName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              {name || "Tên profile"}
            </Text>
          </View>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                color: colors.foreground,
                borderColor: colors.border,
                borderRadius: 12,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Tên profile"
            placeholderTextColor={colors.mutedForeground}
            maxLength={30}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Màu sắc
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {PROFILE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
              >
                {selectedColor === c && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Biểu tượng
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
            {PROFILE_ICONS.map((ic) => (
              <Pressable
                key={ic.key}
                onPress={() => setSelectedIcon(ic.key)}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor:
                      selectedIcon === ic.key ? selectedColor + "22" : colors.muted,
                    borderColor:
                      selectedIcon === ic.key ? selectedColor : "transparent",
                    borderRadius: 12,
                    borderWidth: 2,
                  },
                ]}
              >
                <Ionicons
                  name={ic.label}
                  size={22}
                  color={selectedIcon === ic.key ? selectedColor : colors.mutedForeground}
                />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={handleConfirm}
            disabled={!name.trim()}
            style={[
              styles.confirmBtn,
              {
                backgroundColor: name.trim() ? selectedColor : colors.muted,
                borderRadius: 14,
                opacity: name.trim() ? 1 : 0.5,
              },
            ]}
          >
            <Text style={[styles.confirmText, { fontFamily: "Inter_600SemiBold" }]}>
              {title === "Tạo profile mới" ? "Tạo profile" : "Lưu thay đổi"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kvContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  previewAvatar: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colorRow: {
    paddingBottom: 16,
    gap: 10,
    paddingRight: 8,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iconRow: {
    paddingBottom: 20,
    gap: 10,
    paddingRight: 8,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  confirmText: {
    fontSize: 16,
    color: "#ffffff",
  },
});
