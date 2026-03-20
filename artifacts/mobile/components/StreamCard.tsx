import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import { LiveBadge } from "@/components/ui/LiveBadge";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";

function resolveImage(uri?: string | null) {
  if (!uri) return null;
  if (uri.startsWith("http")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function detectPlatform(url: string): string {
  if (url.includes("youtube")) return "YouTube";
  if (url.includes("twitch")) return "Twitch";
  if (url.includes("tiktok")) return "TikTok";
  if (url.includes("facebook") || url.includes("fb.")) return "Facebook";
  if (url.includes("instagram")) return "Instagram";
  return "Stream";
}

const PLATFORM_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  YouTube: "youtube",
  Twitch: "twitch",
  TikTok: "music",
  Facebook: "facebook",
  Instagram: "instagram",
  Stream: "external-link",
};

type Props = {
  item: any;
  compact?: boolean;
};

export function StreamCard({ item, compact = false }: Props) {
  const isLive = item.isLive === true;
  const name = item.name ?? item.displayName ?? item.username ?? "Streamer";
  const handle = item.username ? `@${item.username}` : null;
  const avatarUri = resolveImage(item.avatarUrl);
  const thumbnailUri = resolveImage(item.thumbnailUrl);
  const category = item.category ?? item.vertical ?? null;
  const tags: string[] = item.tags ?? [];
  const viewers = item.viewerCount ?? 0;
  const title = item.title ?? item.description ?? null;

  const watchUrl = item.streamUrl
    ? item.streamUrl
    : item.username
    ? `https://zito.tv/watch/${item.username}`
    : "https://zito.com";

  const platform = item.streamUrl ? detectPlatform(item.streamUrl) : "ZitoTV";
  const platformIcon: keyof typeof Feather.glyphMap =
    PLATFORM_ICONS[platform] ?? "external-link";

  const handleWatch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(watchUrl);
  };

  return (
    <Pressable
      onPress={handleWatch}
      style={({ pressed }) => [
        s.card,
        isLive && s.cardLive,
        !isLive && s.cardOffline,
        pressed && s.pressed,
      ]}
    >
      {/* Thumbnail strip if available */}
      {thumbnailUri && isLive && !compact ? (
        <Image source={{ uri: thumbnailUri }} style={s.thumbnail} resizeMode="cover" />
      ) : null}

      <View style={s.body}>
        {/* Avatar + Info */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <Avatar uri={avatarUri} name={name} size={compact ? 38 : 46} />
            {isLive ? (
              <View style={s.liveDotBadge} />
            ) : null}
          </View>

          <View style={s.info}>
            <View style={s.nameRow}>
              <Text style={[s.name, !isLive && s.nameOffline]} numberOfLines={1}>
                {name}
              </Text>
              {isLive ? (
                <LiveBadge />
              ) : (
                <View style={s.offlineBadge}>
                  <Text style={s.offlineText}>OFFLINE</Text>
                </View>
              )}
            </View>

            {handle ? <Text style={s.handle}>{handle}</Text> : null}

            <View style={s.metaRow}>
              {category ? (
                <View style={s.categoryChip}>
                  <Text style={s.categoryText}>{category}</Text>
                </View>
              ) : null}
              {isLive && viewers > 0 ? (
                <View style={s.viewersRow}>
                  <Feather name="eye" size={11} color={Colors.live} />
                  <Text style={s.viewersText}>{formatViewers(viewers)} watching</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Stream title */}
        {title && !compact ? (
          <Text style={[s.streamTitle, !isLive && s.streamTitleOffline]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && !compact ? (
          <View style={s.tagsRow}>
            {tags.slice(0, 4).map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Watch button */}
        {isLive ? (
          <View style={s.watchRow}>
            <Feather name={platformIcon} size={13} color={Colors.live} style={{ opacity: 0.8 }} />
            <Text style={s.watchText}>Watch on {platform}</Text>
            <Feather name="external-link" size={13} color={Colors.live} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardLive: {
    borderColor: `${Colors.live}55`,
    backgroundColor: `${Colors.live}06`,
  },
  cardOffline: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: "100%",
    height: 130,
    backgroundColor: Colors.surfaceElevated,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
  },
  liveDotBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.live,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  nameOffline: {
    color: Colors.textSecondary,
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: `${Colors.accent}18`,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryText: {
    color: Colors.accent,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  viewersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewersText: {
    color: Colors.live,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  offlineBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  offlineText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  streamTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  streamTitleOffline: {
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  watchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: `${Colors.live}22`,
  },
  watchText: {
    flex: 1,
    color: Colors.live,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
