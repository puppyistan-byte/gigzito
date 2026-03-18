import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGeeZeeCards, useEngageLeaderboard, useLoveLeaderboard } from "@/hooks/useApi";
import { GeeZeeCardItem } from "@/components/GeeZeeCardItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { NavigationMenu } from "@/components/NavigationMenu";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const TABS = ["Cards", "Top Loved", "Most Engaged"];

export default function GeeZeeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: cards, isLoading: cardsLoading, refetch: refetchCards, isRefetching: refetchingCards } = useGeeZeeCards();
  const { data: loveBoard, isLoading: loveLoading, refetch: refetchLove } = useLoveLeaderboard();
  const { data: engageBoard, isLoading: engageLoading, refetch: refetchEngage } = useEngageLeaderboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const activeData = activeTab === 0 ? cards : activeTab === 1 ? loveBoard : engageBoard;
  const activeLoading = activeTab === 0 ? cardsLoading : activeTab === 1 ? loveLoading : engageLoading;
  const onRefresh = activeTab === 0 ? refetchCards : activeTab === 1 ? refetchLove : refetchEngage;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburger}>
          <Feather name="menu" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.title}>GeeZee Cards</Text>
          <Text style={styles.subtitle}>Social Identity Cards</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab, idx) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(idx)}
            style={[styles.tab, activeTab === idx && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {activeLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={activeData ?? []}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          renderItem={({ item }) => <GeeZeeCardItem item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={!!refetchingCards} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="user"
              title="No GeeZee Cards"
              subtitle="Be the first to create a GeeZee card"
            />
          }
        />
      )}
      <NavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  hamburger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 2,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: {
    color: Colors.darker,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
});
