import { Tabs } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        tabBarActiveTintColor: Colors.accent,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="geezee" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="live" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
