import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import Colors from "@/constants/colors";

type Props = {
  item: any;
  onLike?: () => void;
  likeCount?: number;
};

export function VideoCard({ item, onLike, likeCount }: Props) {
  const handlePress = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/listing/[id]", params: { id: item.id } });
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike?.();
  };

  const thumbnailUrl = item.thumbnailUrl || item.thumbnail_url || null;

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.thumbnail}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Feather name="video" size={32} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Feather name="play" size={16} color={Colors.darker} />
          </View>
        </View>
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Badge label={item.category} color={Colors.accent} bgColor={`${Colors.accent}22`} small />
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title || "Untitled Listing"}</Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.providerRow}>
            <Avatar uri={item.avatarUrl} name={item.displayName || item.username} size={22} />
            <Text style={styles.providerName} numberOfLines={1}>
              {item.displayName || item.username || "Unknown"}
            </Text>
          </View>
          <Pressable onPress={handleLike} style={styles.likeBtn}>
            <Feather name="heart" size={14} color={Colors.textSecondary} />
            {likeCount !== undefined ? (
              <Text style={styles.likeCount}>{likeCount}</Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    height: 180,
    position: "relative",
    backgroundColor: Colors.surfaceElevated,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  content: {
    padding: 14,
    gap: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  providerName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
  },
  likeCount: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
