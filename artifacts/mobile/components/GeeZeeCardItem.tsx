import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import Colors from "@/constants/colors";

type Props = {
  item: any;
};

export function GeeZeeCardItem({ item }: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/geezee/[id]", params: { id: item.id } });
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Avatar uri={item.avatarUrl} name={item.displayName || item.username} size={48} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.displayName || item.username || "Unknown"}
          </Text>
          {item.username ? <Text style={styles.handle}>@{item.username}</Text> : null}
          {item.subscriptionTier ? (
            <Badge label={item.subscriptionTier} color={Colors.teal} bgColor={`${Colors.teal}22`} small />
          ) : null}
        </View>
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
      {item.bio ? (
        <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
      ) : null}
      {item.engageCount !== undefined || item.followerCount !== undefined ? (
        <View style={styles.stats}>
          {item.engageCount !== undefined ? (
            <View style={styles.stat}>
              <Feather name="zap" size={12} color={Colors.accent} />
              <Text style={styles.statText}>{item.engageCount} engages</Text>
            </View>
          ) : null}
          {item.followerCount !== undefined ? (
            <View style={styles.stat}>
              <Feather name="users" size={12} color={Colors.textMuted} />
              <Text style={styles.statText}>{item.followerCount} followers</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  stats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
