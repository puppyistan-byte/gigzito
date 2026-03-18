import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LiveBadge } from "@/components/ui/LiveBadge";
import Colors from "@/constants/colors";

type Props = {
  item: any;
  isLive?: boolean;
};

export function GigJackCard({ item, isLive }: Props) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const startTime = item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const endTime = item.endTime ? new Date(item.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, isLive && styles.liveCard, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title || item.eventName || "Flash Event"}</Text>
          {isLive ? <LiveBadge /> : null}
        </View>
        {item.category ? (
          <View style={styles.categoryRow}>
            <Feather name="tag" size={12} color={Colors.accent} />
            <Text style={styles.category}>{item.category}</Text>
          </View>
        ) : null}
      </View>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.footer}>
        {startTime ? (
          <View style={styles.timeRow}>
            <Feather name="clock" size={12} color={Colors.textMuted} />
            <Text style={styles.time}>{startTime}{endTime ? ` – ${endTime}` : ""}</Text>
          </View>
        ) : null}
        {item.location ? (
          <View style={styles.timeRow}>
            <Feather name="map-pin" size={12} color={Colors.textMuted} />
            <Text style={styles.time} numberOfLines={1}>{item.location}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  liveCard: {
    borderColor: Colors.live,
    backgroundColor: `${Colors.live}15`,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  category: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  footer: {
    gap: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  time: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
