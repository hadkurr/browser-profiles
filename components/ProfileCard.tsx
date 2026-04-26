import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { BrowserProfile } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";

interface Props {
  profile: BrowserProfile;
  isActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onSettings: () => void;
}

function formatLastUsed(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa dùng";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function ProfileCard({ profile, isActive, onPress, onLongPress, onSettings }: Props) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  async function handlePress() {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }

  async function handleLongPress() {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isActive ? profile.color : colors.border,
            borderWidth: isActive ? 2 : 1,
            borderRadius: 16,
          },
        ]}
      >
        <View style={styles.left}>
          <ProfileAvatar
            profile={profile}
            size={52}
            showActive
            isActive={isActive}
          />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  {
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
                numberOfLines={1}
              >
                {profile.name}
              </Text>
              {isActive && (
                <View
                  style={[styles.activeBadge, { backgroundColor: profile.color + "22" }]}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      { color: profile.color, fontFamily: "Inter_500Medium" },
                    ]}
                  >
                    Đang dùng
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              {profile.isPrivate && (
                <Ionicons
                  name="eye-off-outline"
                  size={12}
                  color={colors.mutedForeground}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[
                  styles.meta,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                {formatLastUsed(profile.lastUsed)} · {profile.totalVisits} lượt
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={onSettings}
          hitSlop={12}
          style={styles.settingsBtn}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.mutedForeground}
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontSize: 16,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  activeBadgeText: {
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  meta: {
    fontSize: 13,
  },
  settingsBtn: {
    padding: 8,
    marginLeft: 8,
  },
});
