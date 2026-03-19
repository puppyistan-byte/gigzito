import React, { useState } from "react";
import {
  Dimensions,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowStatus, useToggleFollow } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";
const { width: SW } = Dimensions.get("window");
const GALLERY_COL = (SW - 48) / 3;

const TIER_COLORS: Record<string, string> = {
  GZLurker:      "#71717a",
  GZMarketer:    "#60a5fa",
  GZMarketerPro: "#c084fc",
  GZBusiness:    "#fbbf24",
  GZEnterprise:  "#FFD700",
};

const INTENT_LABELS: Record<string, string> = {
  marketing: "Marketing",
  social:    "Social",
  activity:  "Activity",
};

const SOCIAL_LINKS = [
  { field: "instagramUrl", icon: "instagram",      label: "Instagram", color: "#E1306C" },
  { field: "tiktokUrl",    icon: "music",           label: "TikTok",    color: "#69C9D0" },
  { field: "twitterUrl",   icon: "twitter",         label: "Twitter",   color: "#1DA1F2" },
  { field: "facebookUrl",  icon: "facebook",        label: "Facebook",  color: "#1877F2" },
  { field: "discordUrl",   icon: "message-circle",  label: "Discord",   color: "#7289DA" },
] as const;

function resolveImage(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MotionCard({ motion, token, user, apiRequest }: {
  motion: any;
  token: string | null;
  user: any;
  apiRequest: Function;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: comments, refetch } = useQuery({
    queryKey: ["motion-comments", motion.id],
    queryFn: () => apiRequest<any[]>(`/api/zee-motions/${motion.id}/comments`),
    enabled: expanded,
  });

  const handlePostComment = async () => {
    const text = comment.trim();
    if (!text) return;
    setPosting(true);
    try {
      const authorName = user?.displayName || user?.username || user?.email?.split("@")[0] || "Anonymous";
      await apiRequest(`/api/zee-motions/${motion.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ commentText: text, authorName }),
      });
      setComment("");
      refetch();
    } catch {}
    setPosting(false);
  };

  const mediaUri = resolveImage(motion.mediaUrl);

  return (
    <View style={ms.card}>
      {mediaUri ? (
        <Image source={{ uri: mediaUri }} style={ms.mediaImg} resizeMode="cover" />
      ) : null}
      {motion.text ? (
        <Text style={ms.motionText}>{motion.text}</Text>
      ) : null}
      <View style={ms.motionMeta}>
        <Text style={ms.motionTime}>{timeAgo(motion.createdAt)}</Text>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setExpanded((v) => !v); }}
          style={ms.commentToggle}
        >
          <Feather name="message-circle" size={14} color={expanded ? Colors.purple : Colors.textMuted} />
          <Text style={[ms.commentToggleText, expanded && { color: Colors.purple }]}>
            Comments
          </Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={ms.commentSection}>
          {!comments ? (
            <Text style={ms.loadingText}>Loading...</Text>
          ) : comments.length === 0 ? (
            <Text style={ms.emptyText}>No comments yet — be the first!</Text>
          ) : (
            comments.map((c: any) => (
              <View key={c.id} style={ms.commentRow}>
                <Feather name="user" size={12} color={Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={ms.commentAuthor}>{c.authorName}</Text>
                  <Text style={ms.commentText}>{c.commentText}</Text>
                </View>
              </View>
            ))
          )}
          <View style={ms.commentInput}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textMuted}
              style={ms.commentField}
            />
            <Pressable
              onPress={handlePostComment}
              disabled={!comment.trim() || posting}
              style={[ms.sendBtn, (!comment.trim() || posting) && { opacity: 0.4 }]}
            >
              <Feather name="send" size={14} color={Colors.darker} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function GeeZeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apiRequest, token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const userId = Number(id);

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["geezee-card", id],
    queryFn: () => apiRequest<any>(`/api/gigness-cards/user/${id}`),
    enabled: !!id,
    retry: 1,
  });

  const { data: motions } = useQuery({
    queryKey: ["zee-motions-user", id],
    queryFn: () => apiRequest<any[]>(`/api/zee-motions/user/${id}`),
    enabled: !!id,
  });

  const { data: followStatus, refetch: refetchFollow } = useFollowStatus(userId);
  const { mutateAsync: toggleFollow, isPending: followPending } = useToggleFollow(userId);

  const isOwnCard = user && card && user.id === card.userId;

  const [engageCount, setEngageCount] = useState<number | null>(null);
  const [engaging, setEngaging] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgEmoji, setMsgEmoji] = useState("");
  const [msgErr, setMsgErr] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  const displayCount = engageCount ?? card?.engagementCount ?? 0;

  const handleShowLove = async () => {
    if (!token || !card?.id || engaging) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEngageCount((displayCount) + 1);
    setEngaging(true);
    try {
      await apiRequest(`/api/gigness-cards/${card.id}/engage`, { method: "POST" });
    } catch {}
    setEngaging(false);
  };

  const handleFollow = async () => {
    if (!token) return;
    Haptics.selectionAsync();
    try {
      await toggleFollow(!!(followStatus as any)?.following);
      refetchFollow();
    } catch {}
  };

  const handleSendMessage = async () => {
    const text = msgText.trim();
    const emoji = msgEmoji.trim();
    if (!text && !emoji) return;
    if (!card?.id) return;
    setMsgErr("");
    setMsgSending(true);
    try {
      const body: any = {};
      if (text) body.messageText = text;
      if (emoji) body.emojiReaction = emoji;
      await apiRequest(`/api/gigness-cards/${card.id}/message`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMsgText("");
      setMsgEmoji("");
      setMsgSent(true);
      setMsgOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = e?.message || "";
      setMsgErr(msg.includes("GZ-Bot") || msg.includes("PG")
        ? msg
        : "Message could not be sent. Please try again.");
    }
    setMsgSending(false);
  };

  if (isLoading) return <LoadingScreen />;
  if (isError || !card) return (
    <View style={[s.container, { alignItems: "center", justifyContent: "center", gap: 16, paddingTop: topPad }]}>
      <Feather name="alert-circle" size={40} color={Colors.textMuted} />
      <Text style={{ color: Colors.textMuted, fontSize: 15, fontFamily: "Inter_400Regular" }}>
        This GeeZee card is private or doesn't exist.
      </Text>
      <Pressable onPress={() => router.back()} style={s.backBtn}>
        <Text style={{ color: Colors.textPrimary, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
      </Pressable>
    </View>
  );

  const tier       = card.subscriptionTier || card.userTier || "GZLurker";
  const tierColor  = TIER_COLORS[tier] ?? "#71717a";
  const name       = card.displayName || card.username || "User";
  const intent     = INTENT_LABELS[card.intent] ?? null;
  const gallery    = (card.gallery ?? []).filter(Boolean);
  const isFollowing = !!(followStatus as any)?.following;
  const followerCount = (followStatus as any)?.followerCount;
  const qrUrl = card.qrUuid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=9933ff&bgcolor=050505&data=${encodeURIComponent("https://gigzito.com/qr/" + card.qrUuid)}`
    : null;

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: topPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backCircle}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.topTitle}>GeeZee Card</Text>
        {qrUrl ? (
          <Image source={{ uri: qrUrl }} style={s.topQr} resizeMode="contain" />
        ) : <View style={{ width: 40 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 80 }}>

        {/* ── Hero section ── */}
        <View style={s.hero}>
          <View style={[s.tierBanner, { backgroundColor: `${tierColor}22` }]} />
          <Avatar uri={card.profilePic ?? card.avatarUrl} name={name} size={90} />
          <Text style={s.heroName}>{name}</Text>
          {card.username ? <Text style={s.heroHandle}>@{card.username}</Text> : null}

          <View style={s.badgeRow}>
            <View style={[s.tierBadge, { borderColor: `${tierColor}66`, backgroundColor: `${tierColor}18` }]}>
              <Text style={[s.tierText, { color: tierColor }]}>{tier}</Text>
            </View>
            {intent ? (
              <View style={s.intentBadge}>
                <Text style={s.intentText}>{intent}</Text>
              </View>
            ) : null}
          </View>

          {card.slogan ? (
            <Text style={s.slogan}>{card.slogan}</Text>
          ) : null}

          {/* Age / Gender */}
          {(card.ageBracket || card.gender) ? (
            <View style={s.demoRow}>
              {card.ageBracket ? (
                <View style={s.demoPill}>
                  <Feather name="calendar" size={11} color={Colors.textMuted} />
                  <Text style={s.demoText}>{card.ageBracket}</Text>
                </View>
              ) : null}
              {card.gender ? (
                <View style={s.demoPill}>
                  <Feather name="user" size={11} color={Colors.textMuted} />
                  <Text style={s.demoText}>{card.gender}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Feather name="heart" size={14} color={Colors.danger} />
              <Text style={s.statNum}>{displayCount}</Text>
              <Text style={s.statLabel}>loves</Text>
            </View>
            {followerCount != null ? (
              <View style={s.statDivider} />
            ) : null}
            {followerCount != null ? (
              <View style={s.stat}>
                <Feather name="users" size={14} color={Colors.purple} />
                <Text style={s.statNum}>{followerCount}</Text>
                <Text style={s.statLabel}>followers</Text>
              </View>
            ) : null}
          </View>

          {/* Social links */}
          <View style={s.socialRow}>
            {SOCIAL_LINKS.map(({ field, icon, label, color }) => {
              const url = card[field];
              if (!url) return null;
              return (
                <Pressable
                  key={field}
                  style={[s.socialBtn, { borderColor: `${color}44`, backgroundColor: `${color}15` }]}
                  onPress={() => Haptics.selectionAsync()}
                  hitSlop={6}
                >
                  <Feather name={icon as any} size={16} color={color} />
                  <Text style={[s.socialLabel, { color }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Gallery ── */}
        {gallery.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Gallery</Text>
            <View style={s.galleryGrid}>
              {gallery.slice(0, 9).map((img: string, i: number) => {
                const uri = resolveImage(img);
                if (!uri) return null;
                return (
                  <Image key={i} source={{ uri }} style={s.galleryImg} resizeMode="cover" />
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        {!isOwnCard ? (
          <View style={s.actions}>
            {/* Show Love */}
            {token ? (
              <Pressable
                onPress={handleShowLove}
                disabled={engaging}
                style={({ pressed }) => [s.loveBtn, pressed && s.pressed]}
              >
                <Feather name="heart" size={18} color="#fff" />
                <Text style={s.loveBtnText}>{engaging ? "Sending..." : "Show Love"}</Text>
              </Pressable>
            ) : null}

            {/* Follow / Unfollow */}
            {token ? (
              <Pressable
                onPress={handleFollow}
                disabled={followPending}
                style={({ pressed }) => [
                  s.followBtn,
                  isFollowing && s.followBtnActive,
                  pressed && s.pressed,
                ]}
              >
                <Feather
                  name={isFollowing ? "user-check" : "user-plus"}
                  size={16}
                  color={isFollowing ? Colors.purple : Colors.textPrimary}
                />
                <Text style={[s.followBtnText, isFollowing && s.followBtnTextActive]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            ) : (
              <View style={s.signInNote}>
                <Text style={s.signInNoteText}>Sign in to follow</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Private message ── */}
        {!isOwnCard && card.allowMessaging && token ? (
          <View style={s.section}>
            {msgSent && !msgOpen ? (
              <View style={s.sentRow}>
                <Feather name="check-circle" size={16} color={Colors.success} />
                <Text style={s.sentText}>Message sent!</Text>
              </View>
            ) : null}

            {!msgOpen && !msgSent ? (
              <Pressable
                onPress={() => setMsgOpen(true)}
                style={({ pressed }) => [s.msgTrigger, pressed && s.pressed]}
              >
                <Feather name="message-circle" size={16} color={Colors.textPrimary} />
                <Text style={s.msgTriggerText}>Send Private Message</Text>
              </Pressable>
            ) : null}

            {msgOpen ? (
              <View style={s.msgBox}>
                <Text style={s.msgBoxTitle}>Private Message</Text>
                <TextInput
                  value={msgText}
                  onChangeText={(t) => { setMsgText(t); setMsgErr(""); }}
                  placeholder="Write a message... (max 500 chars)"
                  placeholderTextColor={Colors.textMuted}
                  style={[s.msgInput, msgErr ? s.msgInputErr : null]}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <TextInput
                  value={msgEmoji}
                  onChangeText={setMsgEmoji}
                  placeholder="Emoji reaction 🔥 (optional)"
                  placeholderTextColor={Colors.textMuted}
                  style={s.emojiInput}
                  maxLength={8}
                />
                {msgErr ? (
                  <Text style={s.msgErrText}>{msgErr}</Text>
                ) : null}
                <View style={s.msgBtns}>
                  <Pressable onPress={() => { setMsgOpen(false); setMsgErr(""); }} style={s.cancelBtn}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSendMessage}
                    disabled={(!msgText.trim() && !msgEmoji.trim()) || msgSending}
                    style={[s.sendBtn, ((!msgText.trim() && !msgEmoji.trim()) || msgSending) && { opacity: 0.5 }]}
                  >
                    <Text style={s.sendText}>{msgSending ? "Sending..." : "Send"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Geemotions ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Geemotions</Text>
          {!motions ? (
            <Text style={s.loadingText}>Loading...</Text>
          ) : motions.length === 0 ? (
            <EmptyState icon="zap" title="No Geemotions yet" subtitle="Check back later!" />
          ) : (
            motions.map((m: any) => (
              <MotionCard
                key={m.id}
                motion={m}
                token={token}
                user={user}
                apiRequest={apiRequest}
              />
            ))
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ──────── MotionCard styles ────────
const ms = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
    marginBottom: 10,
  },
  mediaImg: {
    width: "100%",
    height: 200,
  },
  motionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    padding: 14,
    paddingBottom: 8,
  },
  motionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  motionTime: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  commentToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commentToggleText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  commentSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    padding: 12,
    gap: 8,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  commentRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  commentAuthor: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  commentText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  commentInput: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  commentField: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ──────── Screen styles ────────
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
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  topQr: {
    width: 40, height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.purple}44`,
  },
  backBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12, borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  tierBanner: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 90,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  heroName: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
    textAlign: "center",
  },
  heroHandle: {
    color: Colors.purple,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tierBadge: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  tierText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  intentBadge: {
    borderRadius: 20, borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: `${Colors.surfaceBorder}40`,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  intentText: { color: Colors.textSecondary, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  slogan: {
    color: Colors.purple,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  demoRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  demoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  demoText: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statNum: { color: Colors.textPrimary, fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 20, backgroundColor: Colors.surfaceBorder },
  socialRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 4,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  socialLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Gallery
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  galleryImg: {
    width: GALLERY_COL,
    height: GALLERY_COL,
    borderRadius: 8,
  },

  // Actions
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  loveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.danger,
  },
  loveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  followBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  followBtnActive: {
    borderColor: Colors.purple,
    backgroundColor: `${Colors.purple}18`,
  },
  followBtnText: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  followBtnTextActive: { color: Colors.purple },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  signInNote: {
    flex: 1, alignItems: "center", justifyContent: "center",
    height: 48, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  signInNoteText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },

  // Message
  msgTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  msgTriggerText: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  msgBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    gap: 10,
  },
  msgBoxTitle: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_700Bold" },
  msgInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
    textAlignVertical: "top",
  },
  msgInputErr: { borderColor: Colors.danger },
  emojiInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_400Regular",
  },
  msgErrText: {
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  msgBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_500Medium" },
  sendBtn: {
    backgroundColor: Colors.purple,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  sendText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  sentRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center", paddingVertical: 8,
  },
  sentText: { color: Colors.success, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
});
