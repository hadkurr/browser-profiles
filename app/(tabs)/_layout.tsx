import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import C from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function TabLayout() {
  const { user } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tabActive,
        tabBarInactiveTintColor: C.tabInactive,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: "Profiles",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Multi",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="script"
        options={{
          title: "Script",
          tabBarIcon: ({ color, size }) => (
            <Feather name="code" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shield" size={size ?? 22} color={color} />
          ),
          tabBarItemStyle: user?.isAdmin ? {} : { display: "none" },
        }}
      />
    </Tabs>
  );
}
