import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import Colors from "@/constants/colors";

const TIER_COLOR: Record<string, string> = {
  GZMarketerPro: Colors.accent,
  GZBusiness: "#00D9A5",
  GZLurker: "#7C5CBF",
};

const SOCIAL_ICONS: { key: string; icon: string }[] = [
  { key: "facebook",  icon: "facebook"  },
  { key: "instagram", icon: "instagram" },
  { key: "tiktok",    icon: "music"     },
  { key: "youtube",   icon: "youtube"   },
  { key: "twitter",   icon: "twitter"   },
];

type Props = {
  item: any;
  height: number;
};

export function GeeZeeFullCard({ item, height }: Props) {
  const name       = item.displayName || item.username || "Unknown";
  const handle     = item.username ? `@${item.username}` : null;
  const tier       = item.subscriptionTier || "GZLurker";
  const tierColor  = TIER_COLOR[tier] ?? "#7C5CBF";
  const demographic = [item.ageRange, item.gender].filter(Boolean).join(" • ");

  return (
    <View style={[styles.card, { height }]}>
      <LinearGradient colors={["#0B0B1A", "#0D0D0D"]} style={StyleSheet.absoluteFill} />

      <View style={styles.inner}>

        {/* ── Profile ── */}
        <View style={styles.profileBlock}>
          <View style={styles.avatarRing}>
            <Avatar uri={item.avatarUrl} name={name} size={100} />
          </View>

          <View style={styles.nameBlock}>
            <View style={styles.badgeRow}>
              <View style={[styles.pill, { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}18` }]}>
                <Text style={[styles.pillText, { color: tierColor }]}>{tier}</Text>
              </View>
              {item.category ? (
                <View style={[styles.pill, { borderColor: "#7C5CBF55", backgroundColor: "#7C5CBF18" }]}>
                  <Text style={[styles.pillText, { color: "#B89AE0" }]}>{item.category}</Text>
                </View>
              ) : null}
              {handle ? (
                <Text style={styles.handle}>{handle}</Text>
              ) : null}
            </View>

            <Text style={styles.name} numberOfLines={2}>{name}</Text>

            {demographic ? (
              <View style={styles.demRow}>
                <Text style={styles.demographic}>{demographic}</Text>
                <Pressable>
                  <Text style={styles.viewLink}>View →</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Bio ── */}
        <View style={styles.bioBlock}>
          <Text style={styles.bio} numberOfLines={6}>
            {item.bio || "This member hasn't added a bio yet."}
          </Text>
        </View>

        {/* ── Social icons ── */}
        <View style={styles.divider} />
        <View style={styles.socialRow}>
          {SOCIAL_ICONS.map(({ key, icon }) => {
            const active = !!item.socialLinks?.[key];
            return (
              <Pressable
                key={key}
                onPress={() => active && Haptics.selectionAsync()}
                style={[styles.socialBtn, active && styles.socialBtnOn]}
              >
                <Feather
                  name={icon as any}
                  size={20}
                  color={active ? Colors.textSecondary : Colors.surfaceBorder}
                />
              </Pressable>
            );
          })}
        </View>

        {/* ── Action bar ── */}
        <View style={styles.divider} />
        <View style={styles.actionBar}>
          <View style={styles.statsGroup}>
            <View style={styles.statItem}>
              <Feather name="heart" size={15} color={Colors.accent} />
              <Text style={styles.statCount}>{item.engageCount ?? 0}</Text>
            </View>
            <Pressable style={styles.statItem} onPress={() => Haptics.selectionAsync()}>
              <Feather name="message-square" size={15} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.statItem} onPress={() => Haptics.selectionAsync()}>
              <Feather name="bar-chart-2" size={15} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.ctaGroup}>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={styles.followBtn}
            >
              <Feather name="user-plus" size={14} color={Colors.textPrimary} />
              <Text style={styles.followText}>Follow</Text>
            </Pressable>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={styles.engageBtn}
            >
              <Feather name="heart" size={14} color={Colors.accent} />
              <Text style={styles.engageText}>Engage</Text>
            </Pressable>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: "center",
    gap: 18,
  },
  profileBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18,
  },
  avatarRing: {
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    padding: 3,
  },
  nameBlock: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  handle: {
    marginLeft: "auto",
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  demRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demographic: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  viewLink: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: "auto",
  },
  bioBlock: {
    paddingVertical: 4,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  socialBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtnOn: {
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  statsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statCount: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  ctaGroup: {
    flexDirection: "row",
    gap: 10,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  followText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  engageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  engageText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
