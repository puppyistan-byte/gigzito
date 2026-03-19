import React, { useState } from "react";
import {
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
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CommentItem } from "@/components/CommentItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

export default function GeeZeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apiRequest, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [engaging, setEngaging] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [messageText, setMessageText] = useState("");

  // id param is the card owner's userId
  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["geezee-card", id],
    queryFn: () => apiRequest<any>(`/api/gigness-cards/user/${id}`),
    enabled: !!id,
    retry: 1,
  });

  // card.id is the numeric card ID used for engage/message/comment
  const cardId = card?.id;

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["geezee-comments", cardId],
    queryFn: () => apiRequest<any[]>(`/api/gigness-cards/${cardId}/comments`),
    enabled: !!cardId,
  });

  const handleEngage = async () => {
    if (!token || !cardId) return;
    setEngaging(true);
    try {
      await apiRequest(`/api/gigness-cards/${cardId}/engage`, { method: "POST" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setEngaging(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !token || !cardId) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/gigness-cards/${cardId}/message`, {
        method: "POST",
        body: JSON.stringify({ messageText: messageText.trim() }),
      });
      setMessageText("");
      setMessaging(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setSubmitting(false);
  };

  const handleComment = async () => {
    if (!comment.trim() || !token || !cardId) return;
    setSubmitting(true);
    try {
      await apiRequest(`/api/gigness-cards/${cardId}/comments`, {
        method: "POST",
        body: JSON.stringify({ commentText: comment.trim() }),
      });
      setComment("");
      refetchComments();
    } catch {}
    setSubmitting(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) return <LoadingScreen />;
  if (isError || !card) return (
    <View style={[styles.container, { alignItems: "center", justifyContent: "center", gap: 16, paddingTop: topPad }]}>
      <Feather name="alert-circle" size={40} color={Colors.textMuted} />
      <Text style={{ color: Colors.textMuted, fontSize: 15, fontFamily: "Inter_400Regular" }}>
        Card not found or unavailable
      </Text>
      <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.surfaceBorder }}>
        <Text style={{ color: Colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>GeeZee Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 100 }}>
        <View style={styles.cardHero}>
          <View style={styles.cardAccent} />
          <Avatar uri={card.profilePic ?? card.avatarUrl} name={card.displayName || card.username} size={80} />
          <Text style={styles.name}>{card.displayName || card.username || "User"}</Text>
          {card.username ? <Text style={styles.handle}>@{card.username}</Text> : null}
          {card.userTier ? (
            <Badge label={card.userTier} color={Colors.purple} bgColor={`${Colors.purple}22`} />
          ) : null}
          {card.slogan ? <Text style={styles.bio}>{card.slogan}</Text> : null}
        </View>

        {token ? (
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleEngage}
              disabled={engaging}
              style={({ pressed }) => [styles.actionBtn, styles.engageBtn, pressed && styles.pressed]}
            >
              <Feather name="zap" size={16} color={Colors.darker} />
              <Text style={styles.engageBtnText}>{engaging ? "Sending..." : "Geemotion"}</Text>
            </Pressable>
            <Pressable
              onPress={() => setMessaging(true)}
              style={({ pressed }) => [styles.actionBtn, styles.msgBtn, pressed && styles.pressed]}
            >
              <Feather name="message-circle" size={16} color={Colors.textPrimary} />
              <Text style={styles.msgBtnText}>Message</Text>
            </Pressable>
          </View>
        ) : null}

        {messaging ? (
          <View style={styles.messageBox}>
            <Text style={styles.msgLabel}>Send Private Message</Text>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Write a message..."
              placeholderTextColor={Colors.textMuted}
              style={styles.msgInput}
              multiline
              numberOfLines={3}
            />
            <View style={styles.msgActions}>
              <Pressable onPress={() => setMessaging(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSendMessage} disabled={submitting} style={[styles.sendMsgBtn, submitting && { opacity: 0.6 }]}>
                <Text style={styles.sendMsgText}>Send</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments ({comments?.length ?? 0})</Text>
          {!comments?.length ? (
            <EmptyState icon="message-circle" title="No comments yet" />
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
  cardHero: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: `${Colors.teal}18`,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  handle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  engageBtn: { backgroundColor: Colors.accent },
  msgBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  engageBtnText: { color: Colors.darker, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  msgBtnText: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  messageBox: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  msgLabel: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  msgInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  msgActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_500Medium" },
  sendMsgBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  sendMsgText: { color: Colors.darker, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  commentsSection: { paddingHorizontal: 16, gap: 0 },
  commentsHeader: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
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
    height: 40,
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
  sendBtnDisabled: { backgroundColor: Colors.surface },
});
