import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProfileProvider } from "@/context/ProfileContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import C from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "auth";

    if (!user) {
      if (!inAuthGroup) router.replace("/auth/login");
    } else if (!user.isActive && !user.isAdmin) {
      if (segments.join("/") !== "auth/activate") router.replace("/auth/activate");
    } else {
      if (inAuthGroup) router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bgCard },
        headerTintColor: C.primary,
        headerTitleStyle: { color: C.text, fontFamily: "Inter_600SemiBold" },
        contentStyle: { backgroundColor: C.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="profile/[id]"
        options={{
          title: "Chi tiết profile",
          headerBackTitle: "Quay lại",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="browser/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="browser/multi"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{
          title: "Lịch sử phiên",
          headerBackTitle: "Quay lại",
          presentation: "card",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
    Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <ProfileProvider>
              <KeyboardProvider>
                <StatusBar style="light" backgroundColor={C.bg} />
                <AuthGate>
                  <RootLayoutNav />
                </AuthGate>
              </KeyboardProvider>
            </ProfileProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
