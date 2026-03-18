import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");
const GAP = 12;
const H_PAD = 16;
const CARD_W = (SW - H_PAD * 2 - GAP) / 2;
const CARD_H = CARD_W * 1.55;

type Props = {
  item: any;
};

const TIER_COLORS: Record<string, string> = {
  GZMarketerPro: Colors.accent,
  GZBusiness: Colors.success ?? "#00C27C",
  GZLurker: Colors.textMuted,
};

export function GeeZeeCardItem({ item }: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/geezee/[id]", params: { id: item.id } });
  };

  const tier = item.subscriptionTier || "GZLurker";
  const tierColor = TIER_COLORS[tier] ?? Colors.teal;
  const name = item.displayName || item.username || "Unknown";
  const handle = item.username ? `@${item.username}` : null;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={["#1A1A1A", "#0D0D0D"]}
        style={styles.gradient}
      >
        <View style={[styles.tierBar, { backgroundColor: tierColor }]} />

        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <Avatar uri={item.avatarUrl} name={name} size={60} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {handle ? (
            <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
          ) : null}

          <View style={[styles.tierPill, { borderColor: `${tierColor}55`, backgroundColor: `${tierColor}15` }]}>
            <Text style={[styles.tierText, { color: tierColor }]} numberOfLines={1}>
              {tier}
            </Text>
          </View>

          {item.bio ? (
            <Text style={styles.bio} numberOfLines={3}>{item.bio}</Text>
          ) : (
            <Text style={styles.bioEmpty}>No bio yet</Text>
          )}
        </View>

        <View style={styles.footer}>
          {item.engageCount !== undefined ? (
            <View style={styles.stat}>
              <Feather name="zap" size={11} color={Colors.accent} />
              <Text style={styles.statText}>{item.engageCount}</Text>
            </View>
          ) : null}
          {item.followerCount !== undefined ? (
            <View style={styles.stat}>
              <Feather name="users" size={11} color={Colors.textMuted} />
              <Text style={styles.statText}>{item.followerCount}</Text>
            </View>
          ) : null}
          <Feather name="chevron-right" size={13} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  gradient: {
    flex: 1,
    borderRadius: 18,
  },
  tierBar: {
    height: 4,
    width: "100%",
    opacity: 0.9,
  },
  avatarSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 8,
  },
  avatarRing: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    padding: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 6,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  tierPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  tierText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  bioEmpty: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
