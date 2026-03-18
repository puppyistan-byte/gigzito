import React, { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useListing, useListingComments, useToggleLike, useVideoLikes } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CommentItem } from "@/components/CommentItem";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { EmptyState } from "@/components/ui/EmptyState";
import Colors from "@/constants/colors";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = parseInt(id, 10);
  const { apiRequest, token } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: listing, isLoading } = useListing(numId);
  const { data: comments, refetch: refetchComments } = useListingComments(numId);
  const { data: likesData } = useVideoLikes(numId);
  const { mutate: toggleLike } = useToggleLike(numId);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike();
  };

  const handleComment = async () => {
    if (!comment.trim() || !token) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/listings/${numId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment.trim() }),
      });
      setComment("");
      refetchComments();
    } catch {}
    setSubmitting(false);
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) return <LoadingScreen />;
  if (!listing) return <LoadingScreen label="Loading..." />;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{listing.title || "Listing"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 80 }}>
        <View style={styles.media}>
          {listing.thumbnailUrl || listing.thumbnail_url ? (
            <Image source={{ uri: listing.thumbnailUrl || listing.thumbnail_url }} style={styles.thumbnail} />
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Feather name="video" size={48} color={Colors.textMuted} />
            </View>
          )}
          {listing.videoUrl || listing.video_url ? (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Feather name="play" size={24} color={Colors.darker} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.detailPad}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title || "Untitled"}</Text>
            {listing.category ? <Badge label={listing.category} color={Colors.accent} bgColor={`${Colors.accent}22`} small /> : null}
          </View>

          <View style={styles.providerRow}>
            <Avatar uri={listing.avatarUrl} name={listing.displayName || listing.username} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName}>{listing.displayName || listing.username || "Unknown"}</Text>
              {listing.username ? <Text style={styles.handle}>@{listing.username}</Text> : null}
            </View>
            <Pressable onPress={handleLike} style={styles.likeBtn}>
              <Feather name="heart" size={20} color={Colors.textSecondary} />
              <Text style={styles.likeCount}>{likesData?.count ?? likesData?.likes ?? 0}</Text>
            </Pressable>
          </View>

          {listing.description ? (
            <Text style={styles.description}>{listing.description}</Text>
          ) : null}

          {listing.price !== undefined ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.price}>${listing.price}</Text>
            </View>
          ) : null}

          <Text style={styles.commentsHeader}>
            Comments ({comments?.length ?? 0})
          </Text>

          {!comments?.length ? (
            <EmptyState icon="message-circle" title="No comments yet" subtitle="Be the first to comment" />
          ) : (
            comments.map((c: any) => <CommentItem key={c.id} item={c} />)
          )}
        </View>
      </ScrollView>

      {token ? (
        <View style={[styles.commentBar, { paddingBottom: Math.max(bottomPad, 16) }]}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textMuted}
            style={styles.commentInput}
            multiline
            returnKeyType="send"
          />
          <Pressable
            onPress={handleComment}
            disabled={!comment.trim() || submitting}
            style={[styles.sendBtn, (!comment.trim() || submitting) && styles.sendBtnDisabled]}
          >
            <Feather name="send" size={18} color={!comment.trim() ? Colors.textMuted : Colors.darker} />
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  topTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  media: {
    height: 220,
    backgroundColor: Colors.surfaceElevated,
    position: "relative",
  },
  thumbnail: { width: "100%", height: "100%", resizeMode: "cover" },
  mediaPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  detailPad: {
    padding: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    flex: 1,
    lineHeight: 28,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  likeCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
  },
  priceLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  price: {
    color: Colors.accent,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  commentsHeader: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  commentBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.dark,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
});
