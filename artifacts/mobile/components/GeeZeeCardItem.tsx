import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import Colors from "@/constants/colors";

const TIER_COLOR: Record<string, string> = {
  GZMarketerPro: Colors.accent,
  GZBusiness: "#00D9A5",
  GZLurker: "#7C5CBF",
};

const SOCIAL_ICONS = [
  { key: "facebook",  icon: "facebook"  },
  { key: "instagram", icon: "instagram" },
  { key: "tiktok",    icon: "music"     },
  { key: "youtube",   icon: "youtube"   },
  { key: "twitter",   icon: "twitter"   },
];

type Props = {
  item: any;
};

export function GeeZeeCardItem({ item }: Props) {
  const name      = item.displayName || item.username || "Unknown";
  const handle    = item.username ? `@${item.username}` : null;
  const tier      = item.subscriptionTier || "GZLurker";
  const tierColor = TIER_COLOR[tier] ?? "#7C5CBF";
  const demo      = [item.ageRange, item.gender].filter(Boolean).join(" • ");

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/geezee/[id]", params: { id: item.id } }); }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* ── Row 1: avatar + info ── */}
      <View style={styles.topRow}>
        <Avatar uri={item.avatarUrl} name={name} size={58} style={styles.avatar} />

        <View style={styles.info}>
          <View style={styles.badgeRow}>
            <View style={[styles.pill, { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}18` }]}>
              <Text style={[styles.pillText, { color: tierColor }]}>{tier}</Text>
            </View>
            {item.category ? (
              <View style={[styles.pill, { borderColor: "#7C5CBF55", backgroundColor: "#7C5CBF18" }]}>
                <Text style={[styles.pillText, { color: "#B89AE0" }]}>{item.category}</Text>
              </View>
            ) : null}
            {handle ? <Text style={styles.handle}>{handle}</Text> : null}
          </View>

          <Text style={styles.name} numberOfLines={1}>{name}</Text>

          <View style={styles.demRow}>
            {demo ? <Text style={styles.demographic}>{demo}</Text> : null}
            <Text style={styles.viewLink}>View →</Text>
          </View>
        </View>
      </View>

      {/* ── Row 2: social icons ── */}
      <View style={styles.divider} />
      <View style={styles.socialRow}>
        {SOCIAL_ICONS.map(({ key, icon }) => {
          const active = !!item.socialLinks?.[key];
          return (
            <View key={key} style={styles.socialIcon}>
              <Feather
                name={icon as any}
                size={15}
                color={active ? Colors.textSecondary : Colors.surfaceBorder}
              />
            </View>
          );
        })}
      </View>

      {/* ── Row 3: stats + actions ── */}
      <View style={styles.divider} />
      <View style={styles.actionBar}>
        <View style={styles.statsGroup}>
          <View style={styles.stat}>
            <Feather name="heart" size={13} color={Colors.accent} />
            <Text style={styles.statText}>{item.engageCount ?? 0}</Text>
          </View>
          <Feather name="message-square" size={13} color={Colors.textMuted} />
          <Feather name="bar-chart-2"    size={13} color={Colors.textMuted} />
        </View>
        <View style={styles.ctaGroup}>
          <Pressable onPress={() => Haptics.selectionAsync()} style={styles.followBtn}>
            <Feather name="user-plus" size={12} color={Colors.textPrimary} />
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
          <Pressable onPress={() => Haptics.selectionAsync()} style={styles.engageBtn}>
            <Feather name="heart" size={12} color={Colors.accent} />
            <Text style={styles.engageText}>Engage</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#0D0D1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    gap: 10,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  avatar: {
    borderRadius: 10,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  handle: {
    marginLeft: "auto",
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  demRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  demographic: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  viewLink: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  socialIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  ctaGroup: {
    flexDirection: "row",
    gap: 6,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  followText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  engageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  engageText: {
    color: Colors.accent,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
