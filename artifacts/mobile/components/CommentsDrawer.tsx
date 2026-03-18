import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useListingComments } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import Colors from "@/constants/colors";

const { height: SH } = Dimensions.get("window");
const DRAWER_H = SH * 0.65;

type Props = {
  listingId: number;
  open: boolean;
  onClose: () => void;
};

export function CommentsDrawer({ listingId, open, onClose }: Props) {
  const { token, apiRequest } = useAuth();
  const translateY = useRef(new Animated.Value(DRAWER_H)).current;
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [posting, setPosting] = useState(false);
  const [localComments, setLocalComments] = useState<any[]>([]);

  const { data: serverComments, refetch } = useListingComments(open ? listingId : 0);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: open ? 0 : DRAWER_H,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
    if (open) {
      setLocalComments([]);
      refetch();
    }
  }, [open]);

  const allComments = [...(serverComments ?? []), ...localComments];

  const handlePost = async () => {
    if (!comment.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosting(true);
    try {
      const body: any = { commentText: comment.trim() };
      if (!token && email.trim()) body.viewerEmail = email.trim();
      await apiRequest(`/api/listings/${listingId}/comments`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLocalComments((prev) => [
        ...prev,
        {
          id: Date.now(),
          authorName: token ? "You" : (email || "Guest"),
          commentText: comment.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
      setComment("");
    } catch {}
    setPosting(false);
  };

  if (!open) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.drawer, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comments</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          data={allComments}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No comments yet. Be first!</Text>
            </View>
          }
          renderItem={({ item: c }) => (
            <View style={styles.commentRow}>
              <Avatar name={c.authorName} size={32} />
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                <Text style={styles.commentText}>{c.commentText}</Text>
              </View>
            </View>
          )}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.inputArea}>
            {!token && (
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Your email (optional)"
                placeholderTextColor={Colors.textMuted}
                style={styles.emailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
            <View style={styles.inputRow}>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Add a comment…"
                placeholderTextColor={Colors.textMuted}
                style={styles.textInput}
                multiline
                maxLength={300}
              />
              <Pressable
                onPress={handlePost}
                disabled={posting || !comment.trim()}
                style={[styles.postBtn, (!comment.trim() || posting) && styles.postBtnDisabled]}
              >
                <Feather name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  drawer: {
    height: DRAWER_H,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: { padding: 4 },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    flexGrow: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  commentBody: { flex: 1, gap: 2 },
  commentAuthor: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    padding: 12,
    gap: 8,
  },
  emailInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 80,
  },
  postBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  postBtnDisabled: {
    backgroundColor: Colors.surfaceBorder,
  },
});
