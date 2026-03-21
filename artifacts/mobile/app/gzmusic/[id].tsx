import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons, Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";

import {
  useGZ100,
  useGZToggleLike,
  useGZRateTrack,
  useGZTrackComments,
  useGZPostComment,
  useGZDeleteComment,
  useGZRecordPlay,
  useGZBatchLikes,
  useGZAnnounceSingle,
  useGZAnnounceMailing,
  useGZSubscriberCount,
} from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";

const GZ = {
  orange: "#ff7a00",
  orangeDim: "#ff7a0020",
  orangeBorder: "#ff7a0040",
  bg: "#000000",
  card: "#0b0b0b",
  surface: "#111111",
  txt: "#ffffff",
  txt2: "#888888",
  muted: "#555555",
  danger: "#ff2b2b",
};
const API_BASE = "https://www.gigzito.com";

function coverUri(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}
function audioUri(track: any): string | null {
  const u = track?.fileUrl || track?.audioUrl;
  if (!u) return null;
  if (u.startsWith("http")) return u;
  return `${API_BASE}${u}`;
}

function RateStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const TOTAL = 6;
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array(TOTAL).fill(0).map((_, i) => {
        const full = value >= i + 1;
        const half = !full && value >= i + 0.5;
        return (
          <Pressable key={i} onPress={() => onChange(i + 1)} hitSlop={6}>
            <Ionicons
              name={full ? "star" : half ? "star-half" : "star-outline"}
              size={26}
              color={full || half ? GZ.orange : GZ.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const { data: chart } = useGZ100();
  const track = chart?.find((t: any) => t.id === numId);

  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useGZTrackComments(numId);
  const { data: likeMap, refetch: refetchLikes } = useGZBatchLikes([numId]);
  const { data: subCount } = useGZSubscriberCount();

  const toggleLike = useGZToggleLike();
  const rateTrack = useGZRateTrack();
  const postComment = useGZPostComment();
  const deleteComment = useGZDeleteComment();
  const recordPlay = useGZRecordPlay();
  const announceSingle = useGZAnnounceSingle();
  const announceMailing = useGZAnnounceMailing();

  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(null);
  const [userRating, setUserRating] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [announceEmail, setAnnounceEmail] = useState("");
  const [announceMsg, setAnnounceMsg] = useState("");
  const [showAnnounce, setShowAnnounce] = useState(false);

  const liked = likeMap?.[String(numId)] ?? false;
  const isOwner = user && track?.uploaderUserId === user.id;

  function handlePlayPause() {
    const uri = audioUri(track);
    if (!uri) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      try {
        player.replace({ uri });
        player.play();
        setIsPlaying(true);
        recordPlay.mutate(numId);
      } catch (e) { console.warn(e); }
    }
  }

  function stopSound() {
    try { player.pause(); } catch {}
    setIsPlaying(false);
  }

  function handleLike() {
    if (!token) { router.push("/auth/login"); return; }
    toggleLike.mutate(numId, { onSuccess: () => refetchLikes() });
  }

  function handleRate(stars: number) {
    if (!token) { router.push("/auth/login"); return; }
    setUserRating(stars);
    rateTrack.mutate({ id: numId, stars });
  }

  function handleComment() {
    if (!token) { router.push("/auth/login"); return; }
    if (!commentText.trim()) return;
    postComment.mutate({ id: numId, content: commentText.trim() }, {
      onSuccess: () => { setCommentText(""); refetchComments(); },
    });
  }

  function handleDeleteComment(commentId: number) {
    Alert.alert("Delete Comment", "Remove this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => deleteComment.mutate(commentId, { onSuccess: refetchComments }),
      },
    ]);
  }

  function handleAnnounceSingle() {
    if (!announceEmail.trim()) return;
    announceSingle.mutate(
      { trackId: numId, toEmail: announceEmail.trim(), message: announceMsg || undefined },
      { onSuccess: () => { Alert.alert("Sent!", "Announcement delivered."); setAnnounceEmail(""); setAnnounceMsg(""); } }
    );
  }

  function handleAnnounceMailing() {
    Alert.alert(
      "Send to Mailing List",
      `This will email ${subCount?.count ?? 0} subscriber(s). Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => announceMailing.mutate(
            { trackId: numId, message: announceMsg || undefined },
            { onSuccess: (r) => Alert.alert("Sent!", `Delivered to ${r.sent} subscribers.`) }
          ),
        },
      ]
    );
  }

  if (!track) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => { stopSound(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={GZ.txt} />
        </Pressable>
        <View style={styles.loader}>
          <ActivityIndicator color={GZ.orange} size="large" />
        </View>
      </View>
    );
  }

  const cover = coverUri(track.coverUrl);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Back */}
      <Pressable onPress={() => { stopSound(); router.back(); }} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={GZ.txt} />
        <Text style={styles.backLabel}>GZMusic</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Cover Art */}
        <View style={styles.coverSection}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.bigCover} />
          ) : (
            <View style={[styles.bigCover, styles.coverFallback]}>
              <Ionicons name="musical-notes" size={60} color={GZ.orange} />
            </View>
          )}
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{track.title}</Text>
          <Text style={styles.artist}>{track.artist}</Text>
          <View style={styles.genreTag}>
            <Text style={styles.genreText}>{track.genre}</Text>
          </View>
          <View style={styles.statsRow}>
            <Ionicons name="play-circle-outline" size={14} color={GZ.muted} />
            <Text style={styles.statText}>{track.playCount ?? 0} plays</Text>
            <Ionicons name="heart-outline" size={14} color={GZ.muted} />
            <Text style={styles.statText}>{track.likeCount ?? 0} likes</Text>
          </View>
        </View>

        {/* Play button */}
        <Pressable style={styles.playButton} onPress={handlePlayPause}>
          <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={22} color={GZ.bg} />
          <Text style={styles.playButtonText}>{isPlaying ? "Pause" : "Play Track"}</Text>
        </Pressable>

        {/* Like */}
        <Pressable style={[styles.likeButton, liked && styles.likeButtonActive]} onPress={handleLike}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? GZ.bg : GZ.orange} />
          <Text style={[styles.likeButtonText, liked && { color: GZ.bg }]}>
            {liked ? "Liked" : "Like Track"}
          </Text>
        </Pressable>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Rate this track</Text>
          {track.avgRating > 0 && (
            <Text style={styles.avgRating}>
              Avg: {track.avgRating?.toFixed(1)} / 6 ({track.ratingCount} ratings)
            </Text>
          )}
          <RateStars value={userRating} onChange={handleRate} />
          {userRating > 0 && <Text style={styles.yourRating}>Your rating: {userRating}/6</Text>}
        </View>

        {/* Announce (owner only) */}
        {isOwner && (
          <View style={styles.announceSection}>
            <Pressable style={styles.announceTrigger} onPress={() => setShowAnnounce(!showAnnounce)}>
              <Feather name="send" size={16} color={GZ.orange} />
              <Text style={styles.announceTriggerText}>Announce Track</Text>
              <Feather name={showAnnounce ? "chevron-up" : "chevron-down"} size={16} color={GZ.txt2} />
            </Pressable>
            {showAnnounce && (
              <View style={styles.announceBody}>
                <TextInput
                  style={styles.input}
                  placeholder="Optional message…"
                  placeholderTextColor={GZ.muted}
                  value={announceMsg}
                  onChangeText={setAnnounceMsg}
                  multiline
                  numberOfLines={3}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Fan email address"
                  placeholderTextColor={GZ.muted}
                  value={announceEmail}
                  onChangeText={setAnnounceEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Pressable style={styles.announceBtn} onPress={handleAnnounceSingle} disabled={announceSingle.isPending}>
                  {announceSingle.isPending ? (
                    <ActivityIndicator size="small" color={GZ.bg} />
                  ) : (
                    <Text style={styles.announceBtnText}>Send to Email</Text>
                  )}
                </Pressable>
                <Pressable style={[styles.announceBtn, styles.announceBtnOutline]} onPress={handleAnnounceMailing} disabled={announceMailing.isPending}>
                  {announceMailing.isPending ? (
                    <ActivityIndicator size="small" color={GZ.orange} />
                  ) : (
                    <Text style={[styles.announceBtnText, { color: GZ.orange }]}>
                      Send to Mailing List ({subCount?.count ?? 0})
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {token && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment…"
                placeholderTextColor={GZ.muted}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
              />
              <Pressable style={styles.commentSendBtn} onPress={handleComment} disabled={postComment.isPending}>
                {postComment.isPending ? (
                  <ActivityIndicator size="small" color={GZ.bg} />
                ) : (
                  <Ionicons name="send" size={16} color={GZ.bg} />
                )}
              </Pressable>
            </View>
          )}

          {commentsLoading ? (
            <ActivityIndicator color={GZ.orange} style={{ marginTop: 20 }} />
          ) : comments?.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments?.map((c: any) => (
              <View key={c.id} style={styles.commentCard}>
                {c.user?.avatarUrl ? (
                  <Image source={{ uri: c.user.avatarUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, { backgroundColor: GZ.surface, justifyContent: "center", alignItems: "center" }]}>
                    <Ionicons name="person" size={14} color={GZ.muted} />
                  </View>
                )}
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{c.user?.displayName ?? "User"}</Text>
                    <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
                {(user?.id === c.userId || user?.role === "ADMIN" || user?.role === "SUPERADMIN") && (
                  <Pressable onPress={() => handleDeleteComment(c.id)} hitSlop={8}>
                    <Feather name="trash-2" size={14} color={GZ.muted} />
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GZ.bg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  backLabel: { fontSize: 15, color: GZ.orange, fontFamily: "Inter_600SemiBold" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  coverSection: { alignItems: "center", paddingTop: 8, paddingBottom: 16 },
  bigCover: { width: 220, height: 220, borderRadius: 16 },
  coverFallback: { backgroundColor: GZ.surface, justifyContent: "center", alignItems: "center" },

  titleBlock: { paddingHorizontal: 20, gap: 6 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: GZ.txt },
  artist: { fontSize: 16, color: GZ.txt2, fontFamily: "Inter_400Regular" },
  genreTag: {
    alignSelf: "flex-start",
    backgroundColor: GZ.orangeDim,
    borderWidth: 1,
    borderColor: GZ.orangeBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  genreText: { fontSize: 11, color: GZ.orange, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  statText: { fontSize: 12, color: GZ.muted, fontFamily: "Inter_400Regular" },

  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GZ.orange,
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  playButtonText: { fontSize: 16, fontFamily: "Inter_700Bold", color: GZ.bg },

  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: GZ.orange,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
  },
  likeButtonActive: { backgroundColor: GZ.orange },
  likeButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: GZ.orange },

  ratingSection: { paddingHorizontal: 20, marginTop: 24, gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: GZ.txt },
  avgRating: { fontSize: 13, color: GZ.txt2 },
  yourRating: { fontSize: 12, color: GZ.orange, fontFamily: "Inter_600SemiBold" },

  announceSection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: GZ.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
  },
  announceTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  announceTriggerText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", color: GZ.orange },
  announceBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  input: {
    backgroundColor: GZ.surface,
    borderRadius: 8,
    padding: 12,
    color: GZ.txt,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: "#222",
  },
  announceBtn: {
    backgroundColor: GZ.orange,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  announceBtnOutline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: GZ.orange },
  announceBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: GZ.bg },

  commentsSection: { paddingHorizontal: 20, marginTop: 28, gap: 12 },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GZ.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GZ.orangeBorder,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  commentTextInput: { flex: 1, color: GZ.txt, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  commentSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GZ.orange,
    justifyContent: "center",
    alignItems: "center",
  },
  noComments: { color: GZ.muted, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },
  commentCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: GZ.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "flex-start",
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentBody: { flex: 1, gap: 3 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentUser: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GZ.txt },
  commentTime: { fontSize: 11, color: GZ.muted },
  commentContent: { fontSize: 14, color: GZ.txt2, lineHeight: 20 },
});
