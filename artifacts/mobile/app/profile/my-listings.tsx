import React from "react";
import {
  FlatList,
  Image,
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
import * as Haptics from "expo-haptics";
import { useMyListings } from "@/hooks/useApi";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";
function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:  "#00D9A5",
  PAUSED:  "#fbbf24",
  REMOVED: "#FF4B4B",
};

function ListingRow({ item }: { item: any }) {
  const thumb = resolveUrl(item.thumbnailUrl ?? item.thumbnail_url ?? item.provider?.thumbUrl);
  const status: string = item.status ?? "ACTIVE";
  const statusColor = STATUS_COLOR[status] ?? Colors.textMuted;
  const title = item.title ?? item.headline ?? "Untitled";
  const category = item.vertical ?? item.category ?? "";
  const views = item.viewCount ?? item.views ?? 0;
  const likes = item.likeCount ?? item.likes ?? 0;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/listing/[id]", params: { id: item.id } });
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.thumbWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Feather name="video" size={20} color={Colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {category ? (
          <Text style={styles.category}>{category}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}55` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="eye" size={11} color={Colors.textMuted} />
            <Text style={styles.statText}>{views > 999 ? `${Math.floor(views / 1000)}k` : views}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="heart" size={11} color={Colors.textMuted} />
            <Text style={styles.statText}>{likes > 999 ? `${Math.floor(likes / 1000)}k` : likes}</Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { data: listings, isLoading, refetch, isRefetching } = useMyListings();

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSub}>{listings?.length ?? 0} video{(listings?.length ?? 0) !== 1 ? "s" : ""}</Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ListingRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="video"
              title="No listings yet"
              subtitle="Tap 'Add Video' on your profile to post your first listing"
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
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.75,
  },
  thumbWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  thumb: {
    width: 80,
    height: 60,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  category: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
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
