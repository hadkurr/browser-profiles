import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { BrowserProfile } from "@/types";

interface Props {
  profile: BrowserProfile;
  size?: number;
  showActive?: boolean;
  isActive?: boolean;
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  person: "person",
  briefcase: "briefcase",
  school: "school",
  home: "home",
  "game-controller": "game-controller",
  heart: "heart",
  star: "star",
  rocket: "rocket",
};

export function ProfileAvatar({ profile, size = 48, showActive = false, isActive = false }: Props) {
  const iconName = ICON_MAP[profile.icon] ?? "person";
  const iconSize = size * 0.45;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: profile.color,
            borderWidth: isActive && showActive ? 2.5 : 0,
            borderColor: "#ffffff",
          },
        ]}
      >
        <Ionicons name={iconName} size={iconSize} color="#ffffff" />
      </View>
      {isActive && showActive && (
        <View
          style={[
            styles.activeDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
