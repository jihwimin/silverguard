import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/components/providers/AppProvider"; // 경로 확인 필요 [cite: 2026-02-28]
import Colors from "@/constants/colors";

// 스플래시 화면 제어 [cite: 2026-02-28]
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
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
    // 앱 로드 후 스플래시 숨김 [cite: 2026-02-28]
    SplashScreen.hideAsync();
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