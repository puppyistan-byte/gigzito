import React from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");
const API_BASE = "https://www.gigzito.com";

function resolveImageUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function buildQrUrl(qrUuid: string): string {
  const data = encodeURIComponent(`https://gigzito.com/qr/${qrUuid}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=80x80&color=a855f7&bgcolor=0d0d0d&data=${data}`;
}

const TIER_COLORS: Record<string, string> = {
  GZLurker:      "#71717a",
  GZMarketer:    "#60a5fa",
  GZMarketerPro: "#c084fc",
  GZBusiness:    "#fbbf24",
  GZEnterprise:  "#FFD700",
};

const GENDER_ICON_COLOR: Record<string, string> = {
  Female: "#f472b6",
  Male:   "#22d3ee",
  Other:  "#a78bfa",
};

const INTENT_LABEL: Record<string, string> = {
  marketing: "Marketing",
  social:    "Social",
  activity:  "Activity",
};

const DIM = "#3f3f3f";

const ALL_SOCIAL: { key: string; icon: string; field: string }[] = [
  { key: "facebook",  icon: "facebook",       field: "facebookUrl"  },
  { key: "instagram", icon: "instagram",      field: "instagramUrl" },
  { key: "tiktok",    icon: "music",          field: "tiktokUrl"    },
  { key: "youtube",   icon: "youtube",        field: "youtubeUrl"   },
  { key: "twitter",   icon: "twitter",        field: "twitterUrl"   },
  { key: "discord",   icon: "message-circle", field: "discordUrl"   },
];

function ProfileThumb({ uri, name, size }: { uri?: string | null; name: string; size: number }) {
  const resolvedUri = resolveImageUrl(uri);
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={[styles.thumb, { width: size, height: size }]}>
      {resolvedUri ? (
        <Image source={{ uri: resolvedUri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={[styles.thumbInitials, { fontSize: size * 0.34 }]}>{initials}</Text>
      )}
    </View>
  );
}

type Props = { item: any };

export function GeeZeeCardItem({ item }: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    // Route with userId so the detail screen can use GET /api/gigness-cards/user/:userId
    router.push({ pathname: "/geezee/[id]", params: { id: item.userId ?? item.id } });
  };

  const tier      = item.userTier || "GZLurker";
  const tierColor = TIER_COLORS[tier] ?? "#71717a";
  const name      = item.displayName || item.username || "Unknown";
  const handle    = item.username ? `@${item.username}` : null;
  const slogan    = item.slogan || null;
  const intent    = INTENT_LABEL[item.intent] ?? null;
  const demo      = [item.ageBracket, item.gender].filter(Boolean).join("  ");
  const linkedColor = GENDER_ICON_COLOR[item.gender] ?? Colors.purple;
  const qrUrl       = item.qrUuid ? buildQrUrl(item.qrUuid) : null;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient colors={["#1C1C1E", "#111113"]} style={styles.gradient}>
        <View style={[styles.tierStripe, { backgroundColor: tierColor }]} />

        <View style={styles.topRow}>
          <ProfileThumb uri={item.profilePic} name={name} size={62} />

          <View style={styles.centerContent}>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { borderColor: `${tierColor}66`, backgroundColor: `${tierColor}18` }]}>
                <Text style={[styles.pillText, { color: tierColor }]}>{tier}</Text>
              </View>
              {intent ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{intent}</Text>
                </View>
              ) : null}
            </View>

            {slogan ? (
              <Text style={styles.slogan} numberOfLines={2}>{slogan}</Text>
            ) : null}

            {demo ? (
              <Text style={styles.demo}>{demo}</Text>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            {handle ? (
              <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
            ) : null}
            {qrUrl ? (
              <Image source={{ uri: qrUrl }} style={styles.qr} resizeMode="contain" />
            ) : (
              <Image
                source={require("@/assets/images/gz-logo.png")}
                style={styles.gzLogo}
                resizeMode="contain"
              />
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.socialIcons}>
            {ALL_SOCIAL.map(({ key, icon, field }) => {
              const isLinked = !!item[field];
              return (
                <Feather
                  key={key}
                  name={icon as any}
                  size={14}
                  color={isLinked ? linkedColor : DIM}
                />
              );
            })}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Feather name="heart" size={13} color={Colors.purple} />
              <Text style={styles.statText}>{item.engagementCount ?? 0}</Text>
            </View>
            <Feather name="message-circle" size={13} color={Colors.textMuted} />
            <Feather name="grid" size={13} color={Colors.textMuted} />
          </View>

          <Pressable onPress={handlePress} style={styles.viewBtn} hitSlop={8}>
            <Text style={styles.viewBtnText}>View Card</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SW - 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginHorizontal: 12,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    borderRadius: 16,
  },
  tierStripe: {
    height: 3,
    width: "100%",
    opacity: 0.9,
  },
  thumb: {
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.purple,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbInitials: {
    color: Colors.purple,
    fontFamily: "Inter_700Bold",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 10,
  },
  centerContent: {
    flex: 1,
    gap: 5,
    paddingTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: `${Colors.surfaceBorder}30`,
  },
  pillText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  slogan: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 19,
  },
  demo: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 6,
    paddingTop: 2,
  },
  handle: {
    color: Colors.purple,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  qr: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  gzLogo: {
    width: 36,
    height: 22,
    opacity: 0.85,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  socialIcons: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  viewBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${Colors.purple}15`,
  },
  viewBtnText: {
    color: Colors.purple,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
