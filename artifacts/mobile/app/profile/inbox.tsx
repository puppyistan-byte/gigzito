import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useGeeZeeInbox, useMarkMessageRead, useDeleteMessage, useReplyMessage } from "@/hooks/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function MessageCard({ msg, onMarkRead, onDelete, onReply }: {
  msg: any;
  onMarkRead: () => void;
  onDelete: () => void;
  onReply: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [sent, setSent] = useState(false);
  const isUnread = !msg.isRead;

  const handleReply = async () => {
    const text = reply.trim();
    if (!text) return;
    setReplying(true);
    await onReply(text);
    setReply("");
    setSent(true);
    setReplying(false);
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        setExpanded((v) => !v);
        if (isUnread) onMarkRead();
      }}
      style={[s.msgCard, isUnread && s.msgCardUnread]}
    >
      {/* Unread dot */}
      {isUnread ? <View style={s.unreadDot} /> : null}

      <View style={s.msgTop}>
        <View style={s.msgFrom}>
          <View style={s.fromAvatar}>
            <Feather name="user" size={14} color={Colors.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.fromId}>
              User #{msg.fromUserId}
            </Text>
            <Text style={s.msgTime}>{timeAgo(msg.createdAt)}</Text>
          </View>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.textMuted}
        />
      </View>

      {msg.emojiReaction ? (
        <Text style={s.emoji}>{msg.emojiReaction}</Text>
      ) : null}

      {msg.messageText ? (
        <Text
          style={s.msgText}
          numberOfLines={expanded ? undefined : 2}
        >
          {msg.messageText}
        </Text>
      ) : !msg.messageText && !msg.emojiReaction ? (
        <Text style={s.noContent}>(No text)</Text>
      ) : null}

      {expanded ? (
        <View style={s.actions}>
          {/* Reply */}
          {!sent ? (
            <View style={s.replyRow}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Reply by email..."
                placeholderTextColor={Colors.textMuted}
                style={s.replyInput}
                multiline
              />
              <Pressable
                onPress={handleReply}
                disabled={!reply.trim() || replying}
                style={[s.replyBtn, (!reply.trim() || replying) && { opacity: 0.4 }]}
              >
                <Feather name="send" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={s.sentNote}>
              <Feather name="check-circle" size={14} color={Colors.success} />
              <Text style={s.sentText}>Reply sent by email</Text>
            </View>
          )}

          {/* Action row */}
          <View style={s.btnRow}>
            {isUnread ? (
              <Pressable onPress={onMarkRead} style={s.actionChip}>
                <Feather name="check" size={12} color={Colors.textMuted} />
                <Text style={s.actionChipText}>Mark Read</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onDelete} style={[s.actionChip, s.deleteChip]}>
              <Feather name="trash-2" size={12} color={Colors.danger} />
              <Text style={[s.actionChipText, { color: Colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: messages, isLoading, refetch, isRefetching } = useGeeZeeInbox();
  const { mutateAsync: markRead } = useMarkMessageRead();
  const { mutateAsync: deleteMsg } = useDeleteMessage();
  const { mutateAsync: reply } = useReplyMessage();

  const unreadCount = (messages ?? []).filter((m: any) => !m.isRead).length;

  if (isLoading) return <LoadingScreen />;

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>GeeZee Inbox</Text>
          {unreadCount > 0 ? (
            <Text style={s.subtitle}>{unreadCount} unread</Text>
          ) : (
            <Text style={s.subtitle}>All messages</Text>
          )}
        </View>
        {unreadCount > 0 ? (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.purple}
          />
        }
      >
        {!messages || messages.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Inbox is empty"
            subtitle="Messages sent to your GeeZee card will appear here"
          />
        ) : (
          (messages as any[]).map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              onMarkRead={() => markRead(msg.id)}
              onDelete={() =>
                Alert.alert("Delete Message", "Remove this message?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMsg(msg.id) },
                ])
              }
              onReply={async (text) => {
                await reply({ id: msg.id, replyText: text });
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 60,
  },
  msgCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  msgCardUnread: {
    borderColor: `${Colors.purple}44`,
    backgroundColor: `${Colors.purple}08`,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.purple,
  },
  msgTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  msgFrom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  fromAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${Colors.purple}18`,
    alignItems: "center", justifyContent: "center",
  },
  fromId: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  msgTime: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  msgText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  noContent: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  actions: {
    gap: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: 10,
  },
  replyRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 40,
    maxHeight: 100,
  },
  replyBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.purple,
    alignItems: "center", justifyContent: "center",
  },
  sentNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sentText: {
    color: Colors.success,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  deleteChip: {
    borderColor: `${Colors.danger}33`,
    backgroundColor: `${Colors.danger}10`,
  },
  actionChipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
