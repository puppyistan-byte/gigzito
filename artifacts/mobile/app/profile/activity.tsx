import React, { useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useActivityFeed } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";

function resolveImage(uri?: string | null) {
  if (!uri) return null;
  if (uri.startsWith("http")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

type EventType = "VIEW" | "LOVE" | "LIKE";

const FILTER_TABS: { key: "ALL" | EventType; label: string }[] = [
  { key: "ALL",  label: "All" },
  { key: "VIEW", label: "Views" },
  { key: "LOVE", label: "Love" },
  { key: "LIKE", label: "Likes" },
];

const EVENT_CONFIG: Record<EventType, {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
  label: string;
  verb: string;
}> = {
  VIEW: {
    icon: "eye",
    color: "#60A5FA",
    bg: "rgba(59,130,246,0.14)",
    label: "VIEW",
    verb: "viewed your profile",
  },
  LOVE: {
    icon: "heart",
    color: "#F472B6",
    bg: "rgba(244,114,182,0.14)",
    label: "LOVE",
    verb: "showed you love",
  },
  LIKE: {
    icon: "heart",
    color: Colors.danger,
    bg: `${Colors.danger}20`,
    label: "LIKE",
    verb: "liked your comment",
  },
};

function ActivityItem({ event }: { event: any }) {
  const type: EventType = (event.type ?? event.eventType ?? "VIEW").toUpperCase() as EventType;
  const cfg = EVENT_CONFIG[type] ?? EVENT_CONFIG.VIEW;

  const name =
    event.actorDisplayName ??
    event.displayName ??
    (event.actorUsername ? `@${event.actorUsername}` : null) ??
    (event.username ? `@${event.username}` : null) ??
    `User #${event.actorUserId ?? event.fromUserId ?? "?"}`;

  const avatarUri = resolveImage(
    event.actorAvatarUrl ?? event.avatarUrl ?? null
  );

  const context = event.context ?? event.commentText ?? event.listingTitle ?? null;

  return (
    <View style={s.item}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <Avatar uri={avatarUri} name={name} size={44} />
        <View style={[s.eventDot, { backgroundColor: cfg.color }]}>
          <Feather name={cfg.icon} size={9} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View style={s.itemContent}>
        <Text style={s.itemText} numberOfLines={2}>
          <Text style={s.actorName}>{name} </Text>
          <Text style={s.verb}>{cfg.verb}</Text>
        </Text>
        {context ? (
          <Text style={s.context} numberOfLines={1}>"{context}"</Text>
        ) : null}
        <Text style={s.time}>{timeAgo(event.createdAt ?? event.timestamp ?? new Date().toISOString())}</Text>
      </View>

      {/* Badge */}
      <View style={[s.badge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}33` }]}>
        <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [filter, setFilter] = useState<"ALL" | EventType>("ALL");

  const { data: raw, isLoading, refetch, isRefetching } = useActivityFeed();

  const all: any[] = raw ?? [];

  const filtered = filter === "ALL"
    ? all
    : all.filter((e) =>
        (e.type ?? e.eventType ?? "VIEW").toUpperCase() === filter
      );

  // Count per type for tab badges
  const counts: Record<string, number> = { ALL: all.length };
  all.forEach((e) => {
    const t = (e.type ?? e.eventType ?? "VIEW").toUpperCase();
    counts[t] = (counts[t] ?? 0) + 1;
  });

  const EMPTY_MESSAGES: Record<string, { title: string; subtitle: string }> = {
    ALL:  { title: "No activity yet",     subtitle: "When people view your profile, show love, or like your comments, it'll appear here" },
    VIEW: { title: "No profile views yet", subtitle: "When someone visits your profile you'll see them here" },
    LOVE: { title: "No love yet",          subtitle: "Be the first to get some love on Gigzito!" },
    LIKE: { title: "No comment likes yet", subtitle: "Post great content and people will start liking your comments" },
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Activity</Text>
          <Text style={s.subtitle}>Who's engaging with your profile</Text>
        </View>
        {all.length > 0 ? (
          <View style={s.totalBadge}>
            <Text style={s.totalBadgeText}>{all.length}</Text>
          </View>
        ) : null}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <Pressable
              key={tab.key}
              onPress={() => { Haptics.selectionAsync(); setFilter(tab.key); }}
              style={[s.tab, active && s.tabActive]}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 ? (
                <View style={[s.tabCount, active && s.tabCountActive]}>
                  <Text style={[s.tabCountText, active && s.tabCountTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.accent}
          />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={filter === "VIEW" ? "eye" : filter === "LOVE" ? "heart" : filter === "LIKE" ? "thumbs-up" : "activity"}
            title={EMPTY_MESSAGES[filter].title}
            subtitle={EMPTY_MESSAGES[filter].subtitle}
          />
        ) : (
          <View style={s.card}>
            {filtered.map((event: any, i: number) => (
              <View key={event.id ?? i}>
                <ActivityItem event={event} />
                {i < filtered.length - 1 ? <View style={s.divider} /> : null}
              </View>
            ))}
          </View>
        )}

        {/* Auto-refresh note */}
        {all.length > 0 ? (
          <Text style={s.refreshNote}>
            <Feather name="refresh-cw" size={10} color={Colors.textMuted} /> Refreshes every 30 seconds
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  totalBadge: {
    minWidth: 32, height: 32, borderRadius: 16,
    backgroundColor: `${Colors.accent}18`,
    borderWidth: 1, borderColor: `${Colors.accent}33`,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 10,
  },
  totalBadgeText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tabActive: {
    backgroundColor: `${Colors.accent}18`,
    borderColor: Colors.accent,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  tabTextActive: { color: Colors.accent },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountActive: { backgroundColor: `${Colors.accent}33` },
  tabCountText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  tabCountTextActive: { color: Colors.accent },

  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: 14,
  },

  avatarWrap: {
    position: "relative",
  },
  eventDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },

  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actorName: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  verb: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  context: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  time: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },

  refreshNote: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
});
