import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMyGeemotions } from "@/hooks/useApi";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import Colors from "@/constants/colors";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function GeemotionRow({ item }: { item: any }) {
  const emoji      = item.emoji ?? item.emojiReaction ?? "";
  const text       = item.text ?? item.messageText ?? item.content ?? "";
  const createdAt  = item.createdAt ?? item.timestamp ?? "";
  const comments   = item.commentCount ?? item.commentsCount ?? 0;
  const likes      = item.likeCount ?? item.likes ?? 0;

  return (
    <View style={styles.row}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{emoji || "💬"}</Text>
      </View>
      <View style={styles.info}>
        {text ? (
          <Text style={styles.text} numberOfLines={3}>{text}</Text>
        ) : (
          <Text style={styles.textMuted}>Emoji reaction</Text>
        )}
        <View style={styles.metaRow}>
          {createdAt ? (
            <Text style={styles.time}>{timeAgo(createdAt)}</Text>
          ) : null}
          {likes > 0 ? (
            <View style={styles.statItem}>
              <Feather name="heart" size={11} color={Colors.textMuted} />
              <Text style={styles.statText}>{likes}</Text>
            </View>
          ) : null}
          {comments > 0 ? (
            <View style={styles.statItem}>
              <Feather name="message-circle" size={11} color={Colors.textMuted} />
              <Text style={styles.statText}>{comments}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function MyGeemotionsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { data: geemotions, isLoading, refetch, isRefetching } = useMyGeemotions();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>My Geemotions</Text>
          <Text style={styles.headerSub}>{geemotions?.length ?? 0} post{(geemotions?.length ?? 0) !== 1 ? "s" : ""}</Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={geemotions ?? []}
          keyExtractor={(item, i) => String(item?.id ?? i)}
          renderItem={({ item }) => <GeemotionRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.purple} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="zap"
              title="No Geemotions yet"
              subtitle="React to content and your Geemotions will appear here"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  text: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  textMuted: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  time: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
});
