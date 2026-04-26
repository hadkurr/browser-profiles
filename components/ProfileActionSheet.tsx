import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { BrowserProfile } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";

interface Action {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  profile: BrowserProfile | null;
  onClose: () => void;
  actions: Action[];
}

export function ProfileActionSheet({ visible, profile, onClose, actions }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  async function handleAction(action: Action) {
    if (action.disabled) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    action.onPress();
    onClose();
  }

  if (!profile) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
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

        <View style={styles.profileHeader}>
          <ProfileAvatar profile={profile} size={44} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {profile.name}
            </Text>
            <Text style={[styles.profileMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {profile.totalVisits} lượt truy cập
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {actions.map((action, i) => (
          <Pressable
            key={i}
            onPress={() => handleAction(action)}
            disabled={action.disabled}
            style={({ pressed }) => [
              styles.actionRow,
              { opacity: action.disabled ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor: action.destructive
                    ? colors.destructive + "15"
                    : colors.primary + "12",
                  borderRadius: 10,
                },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={action.destructive ? colors.destructive : colors.primary}
              />
            </View>
            <Text
              style={[
                styles.actionLabel,
                {
                  color: action.destructive ? colors.destructive : colors.foreground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={onClose}
          style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: 14 }]}
        >
          <Text style={[styles.cancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Đóng
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  profileName: {
    fontSize: 17,
  },
  profileMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 16,
  },
  cancelBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
  },
});
