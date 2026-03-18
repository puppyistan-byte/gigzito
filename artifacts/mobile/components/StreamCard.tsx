import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import { LiveBadge } from "@/components/ui/LiveBadge";
import Colors from "@/constants/colors";

type Props = {
  item: any;
};

export function StreamCard({ item }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Avatar uri={item.avatarUrl} name={item.displayName || item.username} size={44} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.displayName || item.title || "Live Stream"}</Text>
            <LiveBadge />
          </View>
          {item.username ? <Text style={styles.handle}>@{item.username}</Text> : null}
          {item.viewerCount !== undefined ? (
            <View style={styles.viewerRow}>
              <Feather name="eye" size={12} color={Colors.textMuted} />
              <Text style={styles.viewers}>{item.viewerCount} watching</Text>
            </View>
          ) : null}
        </View>
      </View>
      {item.title || item.description ? (
        <Text style={styles.title} numberOfLines={2}>
          {item.title || item.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${Colors.live}44`,
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
    gap: 12,
    alignItems: "flex-start",
  },
  info: {
    flex: 1,
    gap: 3,
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
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewers: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
});
