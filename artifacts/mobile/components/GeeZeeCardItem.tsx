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

const TIER_COLORS: Record<string, string> = {
  GZMarketerPro: Colors.accent,
  GZBusiness: Colors.success ?? "#00C27C",
  GZLurker: Colors.purple,
};

const SOCIAL_ICONS: { key: string; icon: string }[] = [
  { key: "facebook", icon: "facebook" },
  { key: "instagram", icon: "instagram" },
  { key: "twitter", icon: "twitter" },
  { key: "youtube", icon: "youtube" },
];

type Props = {
  item: any;
};

function ProfileThumb({ uri, name, size }: { uri?: string | null; name: string; size: number }) {
  const resolvedUri = resolveImageUrl(uri);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

export function GeeZeeCardItem({ item }: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/geezee/[id]", params: { id: item.id } });
  };

  const tier = item.subscriptionTier || "GZLurker";
  const tierColor = TIER_COLORS[tier] ?? Colors.purple;
  const name = item.displayName || item.username || "Unknown";
  const handle = item.username ? `@${item.username}` : null;
  const category = item.category || "Social";
  const bio = item.bio || item.tagline || "Here for the experience";
  const demographics = [item.ageRange, item.gender].filter(Boolean).join("  ");

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={["#1C1C1E", "#111113"]}
        style={styles.gradient}
      >
        <View style={[styles.tierStripe, { backgroundColor: tierColor }]} />

        <View style={styles.topRow}>
          <ProfileThumb uri={item.avatarUrl} name={name} size={62} />

          <View style={styles.centerContent}>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { borderColor: `${tierColor}66`, backgroundColor: `${tierColor}18` }]}>
                <Text style={[styles.pillText, { color: tierColor }]}>{tier}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{category}</Text>
              </View>
            </View>

            <Text style={styles.name} numberOfLines={1}>{name}</Text>

            {bio ? (
              <Text style={styles.bio} numberOfLines={2}>{bio}</Text>
            ) : null}

            {demographics ? (
              <Text style={styles.demo}>{demographics}</Text>
            ) : null}
          </View>

          <View style={styles.rightCol}>
            {handle ? (
              <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
            ) : null}
            <Image
              source={require("@/assets/images/gz-logo.png")}
              style={styles.gzLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.socialIcons}>
            {SOCIAL_ICONS.map(({ key, icon }) => (
              <Feather key={key} name={icon as any} size={15} color={Colors.textMuted} style={styles.socialIcon} />
            ))}
          </View>

          <View style={styles.statsRow}>
            {item.engageCount !== undefined ? (
              <View style={styles.stat}>
                <Feather name="heart" size={13} color={Colors.purple} />
                <Text style={styles.statText}>{item.engageCount ?? 0}</Text>
              </View>
            ) : null}
            <Feather name="grid" size={13} color={Colors.textMuted} />
          </View>

          <Pressable
            onPress={handlePress}
            style={styles.viewBtn}
            hitSlop={8}
          >
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
    gap: 4,
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
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
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
    gap: 10,
  },
  socialIcons: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
  },
  socialIcon: {
    opacity: 0.7,
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
