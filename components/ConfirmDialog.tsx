import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  onConfirm,
  onCancel,
  destructive = false,
}: Props) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} />
      <View style={styles.centered}>
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderRadius: 20 },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {message}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.btn,
                { backgroundColor: colors.muted, borderRadius: 12 },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[
                styles.btn,
                {
                  backgroundColor: destructive ? colors.destructive : colors.primary,
                  borderRadius: 12,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: "#ffffff", fontFamily: "Inter_600SemiBold" }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 15,
  },
});
