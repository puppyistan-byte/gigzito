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

function normalizeCard(item: any) {
  if (!item) return item;
  const card = item.card ?? item.gigness_card ?? item;
  const user = item.user ?? item.provider ?? {};
  return {
    ...user,
    ...card,
    id:              card.id        ?? item.id        ?? item.cardId,
    userTier:        card.userTier  ?? card.subscriptionTier ?? item.userTier ?? item.subscriptionTier,
    profilePic:      card.profilePic ?? card.avatarUrl ?? item.profilePic ?? item.avatarUrl ?? user.avatarUrl,
    displayName:     card.displayName ?? item.displayName ?? user.displayName,
    username:        card.username  ?? item.username  ?? user.username,
    slogan:          card.slogan    ?? card.tagline   ?? item.slogan ?? item.tagline ?? item.bio,
    ageBracket:      card.ageBracket ?? item.ageBracket ?? item.ageRange,
    gender:          card.gender    ?? item.gender,
    intent:          card.intent    ?? item.intent    ?? (item.category ? item.category.toLowerCase() : null),
    qrUuid:          card.qrUuid   ?? item.qrUuid,
    engagementCount: card.engagementCount ?? item.engagementCount ?? item.engageCount ?? item.loveCount ?? 0,
    showSocialLinks: card.showSocialLinks ?? item.showSocialLinks ?? true,
    instagramUrl:    card.instagramUrl ?? item.instagramUrl,
    tiktokUrl:       card.tiktokUrl    ?? item.tiktokUrl,
    facebookUrl:     card.facebookUrl  ?? item.facebookUrl,
    twitterUrl:      card.twitterUrl   ?? item.twitterUrl,
    discordUrl:      card.discordUrl   ?? item.discordUrl,
    youtubeUrl:      card.youtubeUrl   ?? item.youtubeUrl,
  };
}

export default function GeeZeeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: cards, isLoading: cardsLoading, refetch: refetchCards, isRefetching: refetchingCards } = useGeeZeeCards();
  const { data: loveBoard, isLoading: loveLoading, refetch: refetchLove } = useLoveLeaderboard();
  const { data: engageBoard, isLoading: engageLoading, refetch: refetchEngage } = useEngageLeaderboard();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const rawData = activeTab === 0 ? cards : activeTab === 1 ? loveBoard : engageBoard;
  const activeData = (rawData ?? []).map(normalizeCard);
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
          data={activeData}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
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
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
    gap: 12,
  },
});
