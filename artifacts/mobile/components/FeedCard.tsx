import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToggleLike } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { CommentsDrawer } from "@/components/CommentsDrawer";
import { InquireModal } from "@/components/InquireModal";
import { ShareSheet } from "@/components/ShareSheet";
import { NavigationMenu, HamburgerButton } from "@/components/NavigationMenu";
import Colors from "@/constants/colors";

const { width: SW, height: SH } = Dimensions.get("window");
const API_BASE = "https://www.gigzito.com";

function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function formatTime(secs: number) {
  if (secs <= 0) return "0s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ctaLabel(ctaType?: string) {
  switch (ctaType) {
    case "Visit Offer": return "Visit Offer";
    case "Shop Product": return "Shop Now";
    case "Join Event": return "Join Event";
    case "Book Service": return "Book Now";
    case "Join Guild": return "Join Guild";
    default: return "Inquire";
  }
}

type Props = {
  item: any;
  isActive: boolean;
};

export function FeedCard({ item, isActive }: Props) {
  const { token } = useAuth();
  const { mutate: toggleLike } = useToggleLike(item.id);

  const totalSecs = item.durationSeconds || 60;
  const [timeLeft, setTimeLeft] = useState(totalSecs);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inquireOpen, setInquireOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeLeft(totalSecs);
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, totalSecs]);

  const timerColor =
    timeLeft <= 5 ? Colors.accent :
    timeLeft <= 15 ? "#F5A623" :
    "rgba(255,255,255,0.9)";

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!token) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c: number) => wasLiked ? c - 1 : c + 1);
    toggleLike(undefined, {
      onError: () => {
        setLiked(wasLiked);
        setLikeCount((c: number) => wasLiked ? c + 1 : c - 1);
      },
      onSuccess: (data: any) => {
        setLiked(data.liked ?? !wasLiked);
        setLikeCount(data.likeCount ?? likeCount);
      },
    });
  }, [liked, token, toggleLike, likeCount]);

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!token) return;
    if (item.ctaType === "Shop Product" && item.ctaUrl) {
      const { Linking } = require("react-native");
      Linking.openURL(item.ctaUrl);
    } else {
      setInquireOpen(true);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareOpen(true);
  };

  const handleAvatar = () => {
    if (item.provider?.id) {
      router.push({ pathname: "/listing/[id]", params: { id: item.id } });
    }
  };

  const poster = resolveUrl(item.provider?.thumbUrl || item.thumbnailUrl || item.thumbnail_url || null);
  const tags: string[] = item.tags ?? [];
  const vertical = item.vertical || item.category || "";

  const videoUrl = item.videoUrl || item.video_url || "";
  const shareUrl = videoUrl || `https://gigzito.com/listing/${item.id}`;

  return (
    <View style={styles.card}>
      {/* Background poster */}
      {poster ? (
        <Image source={{ uri: poster }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={[styles.bg, styles.bgFallback]}>
          <Feather name="video" size={48} color={Colors.textMuted} />
        </View>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
        locations={[0.3, 0.6, 1]}
        style={styles.gradient}
      />

      {/* Hamburger — top left */}
      <HamburgerButton onPress={() => setMenuOpen(true)} />

      {/* Add Video — next to hamburger, only when logged in */}
      {token ? (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/listing/create" as any); }}
          style={styles.addVideoBtn}
        >
          <Feather name="plus" size={14} color="#fff" />
          <Text style={styles.addVideoText}>Add Video</Text>
        </Pressable>
      ) : null}

      {/* Duration timer — top right */}
      <View style={styles.timerWrap}>
        <Feather name="clock" size={11} color={timerColor} />
        <Text style={[styles.timerText, { color: timerColor }]}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Right rail buttons */}
      <View style={styles.rightRail}>
        {/* GZFlash — above GeeZee */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/gzflash" as any); }}
          style={styles.railBtn}
        >
          <Image
            source={require("@/assets/images/gz-flash-logo.png")}
            style={styles.gzIcon}
            resizeMode="contain"
          />
        </Pressable>

        {/* GeeZee Rolodex */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/geezee" as any); }}
          style={styles.railBtn}
        >
          <Image
            source={require("@/assets/images/gz-logo.png")}
            style={styles.gzIcon}
            resizeMode="contain"
          />
        </Pressable>

        {/* Mute */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setMuted((m) => !m); }}
          style={styles.railBtn}
          testID={`button-mute-${item.id}`}
        >
          <Feather name={muted ? "volume-x" : "volume-2"} size={20} color="#fff" />
        </Pressable>

        {/* Like / Show Love */}
        <View style={styles.railGroup}>
          <Pressable
            onPress={handleLike}
            style={styles.railBtn}
            testID={`button-like-${item.id}`}
          >
            <Feather
              name="heart"
              size={22}
              color={liked ? Colors.accent : "#fff"}
              fill={liked ? Colors.accent : "none"}
            />
          </Pressable>
          <Text style={styles.railCount} testID={`text-like-count-${item.id}`}>
            {likeCount > 999 ? `${Math.floor(likeCount / 1000)}k` : likeCount}
          </Text>
        </View>

        {/* Comment */}
        <View style={styles.railGroup}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setCommentsOpen(true); }}
            style={styles.railBtn}
            testID={`button-comments-${item.id}`}
          >
            <Feather name="message-circle" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.railCount}>{item.commentCount ?? ""}</Text>
        </View>
      </View>

      {/* Creator avatar — bottom right floating */}
      <Pressable
        onPress={handleAvatar}
        style={styles.avatarWrap}
        testID={`avatar-creator-${item.id}`}
      >
        {resolveUrl(item.provider?.profilePic ?? item.provider?.avatarUrl ?? item.avatarUrl) ? (
          <Image
            source={{ uri: resolveUrl(item.provider?.profilePic ?? item.provider?.avatarUrl ?? item.avatarUrl)! }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Feather name="user" size={18} color={Colors.textSecondary} />
          </View>
        )}
        <View style={styles.avatarBorder} />
      </Pressable>

      {/* Bottom content overlay */}
      <View style={[styles.bottomContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Category badge */}
        {vertical ? (
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{vertical.toUpperCase()}</Text>
          </View>
        ) : null}

        {/* Title */}
        <Text style={styles.title} numberOfLines={3}>{item.title || "Untitled"}</Text>

        {/* Description */}
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* CTA row */}
        <View style={styles.ctaRow}>
          <Pressable
            onPress={handleCta}
            style={styles.ctaBtn}
            testID={`button-inquire-${item.id}`}
          >
            <Feather name="external-link" size={14} color="#fff" />
            <Text style={styles.ctaBtnText}>{ctaLabel(item.ctaType)}</Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={styles.shareBtn}
            testID={`button-share-${item.id}`}
          >
            <Feather name="share-2" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Hashtags */}
        {tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {tags.slice(0, 5).map((tag) => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        ) : null}
      </View>

      {/* Modals & drawers */}
      <CommentsDrawer
        listingId={item.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
      <InquireModal
        item={item}
        open={inquireOpen}
        onClose={() => setInquireOpen(false)}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={item.title}
        url={shareUrl}
        videoUrl={videoUrl}
      />
      <NavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SW,
    height: SH,
    backgroundColor: "#000",
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  bgFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  addVideoBtn: {
    position: "absolute",
    top: 56,
    left: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.danger,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 10,
  },
  addVideoText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  timerWrap: {
    position: "absolute",
    top: 56,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  rightRail: {
    position: "absolute",
    right: 12,
    bottom: 200,
    alignItems: "center",
    gap: 4,
  },
  railGroup: {
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  railBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  gzIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  railCount: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  avatarWrap: {
    position: "absolute",
    right: 14,
    bottom: 145,
    width: 50,
    height: 50,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarFallback: {
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBorder: {
    position: "absolute",
    bottom: -4,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: "#000",
  },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 70,
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 6,
  },
  catBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  desc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  tag: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
