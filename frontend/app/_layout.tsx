import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Linking, Platform, PermissionsAndroid } from "react-native";
import { AppProvider } from "@/components/providers/AppProvider";
import Colors from "@/constants/colors";
import { setPendingPhishing } from "@/lib/pendingPhishingStore";

// 스플래시 화면 제어 [cite: 2026-02-28]
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    const handler = (url: string | null) => {
      if (!url?.includes("guardian-alerts") && !url?.includes("diagnosis")) return;
      try {
        const u = new URL(url);
        const text = u.searchParams.get("text");
        const percentStr = u.searchParams.get("percent");
        const percent = percentStr ? parseInt(percentStr, 10) : NaN;
        const decodedText = text ? decodeURIComponent(String(text).replace(/\+/g, " ")).trim() : "";
        if (decodedText && !isNaN(percent) && percent >= 0 && percent <= 100) {
          setPendingPhishing({ text: decodedText, percent });
        }
        router.replace("/(tabs)/diagnosis" as any);
      } catch (_) {}
    };
    Linking.getInitialURL().then(handler);
    const sub = Linking.addEventListener("url", ({ url }) => handler(url));
    return () => sub.remove();
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="verification" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="reporting-chatbot"
        options={{ presentation: "modal", gestureEnabled: true }}
      />
      <Stack.Screen name="transfer-protection" />
      <Stack.Screen name="training-game" />
      <Stack.Screen name="training-play" />
      <Stack.Screen name="training-result" />
      <Stack.Screen name="guardian-hub" />
      <Stack.Screen name="guardian-link" />
      <Stack.Screen name="guardian-code" />
      <Stack.Screen name="guardian-alerts" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      const perms: string[] = [
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      ];
      if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      if (perms.length) {
        PermissionsAndroid.requestMultiple(perms as any).catch(() => {});
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}