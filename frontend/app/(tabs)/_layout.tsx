import { Tabs } from "expo-router";
import { Home, ShieldCheck, ScanSearch, Menu } from "lucide-react-native";
import React from "react";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="protection"
        options={{
          title: "Live protection",
          tabBarIcon: ({ color, size }) => <ShieldCheck size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="diagnosis"
        options={{
          title: "Diagnosis",
          tabBarIcon: ({ color, size }) => <ScanSearch size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
