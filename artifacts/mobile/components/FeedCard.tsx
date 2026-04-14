import React, { useCallback, useEffect, useRef, useState } from "react";
import Svg, { Rect, Polygon } from "react-native-svg";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { useToggleLike, useVideoLikes } from "@/hooks/useApi";
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

const YT_PATTERNS = [
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

/** Extract the 11-char YouTube video ID, or null if not a YouTube URL. */
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Return a YouTube thumbnail URL if the given videoUrl is a YouTube link. */
function youtubeThumb(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** True when the URL is a file hosted on gigzito (relative or absolute gigzito domain). */
function isGigzitoVideo(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  if (url.startsWith(API_BASE + "/uploads/")) return true;
  return false;
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
  muted: boolean;
  onMuteToggle: () => void;
  cardHeight?: number;
};

export function FeedCard({ item, isActive, muted, onMuteToggle, cardHeight }: Props) {
  const cardH = cardHeight ?? SH;
  const { token } = useAuth();
  const { mutate: toggleLike } = useToggleLike(item.id);

  // Fetch real like status from the API — resolves whether this user has already liked
  const { data: videoLikesData } = useVideoLikes(item.id);
  const [likeInitialized, setLikeInitialized] = useState(false);

  const totalSecs = item.durationSeconds || 60;
  const [timeLeft, setTimeLeft] = useState(totalSecs);
  const [liked, setLiked] = useState<boolean>(
    item.isLiked ?? item.userLiked ?? item.liked ?? false
  );
  const [likeCount, setLikeCount] = useState<number>(
    typeof item.likeCount === "number" ? item.likeCount : 0
  );
  const [cardPressed, setCardPressed] = useState(false);

  // Once the per-video likes data arrives, sync liked + count (only on first load)
  useEffect(() => {
    if (videoLikesData && !likeInitialized) {
      if (typeof videoLikesData.liked === "boolean") setLiked(videoLikesData.liked);
      if (typeof videoLikesData.userLiked === "boolean") setLiked(videoLikesData.userLiked);
      if (typeof videoLikesData.likeCount === "number") setLikeCount(videoLikesData.likeCount);
      setLikeInitialized(true);
    }
  }, [videoLikesData, likeInitialized]);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inquireOpen, setInquireOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const ytIframeRef = useRef<any>(null);
  const ytWebViewRef = useRef<any>(null);
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
    const prevCount = likeCount;
    // Optimistic update — immediate UI response
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    toggleLike(undefined, {
      onError: () => {
        // Revert to exact pre-click values on failure
        setLiked(wasLiked);
        setLikeCount(prevCount);
      },
      onSuccess: (data: any) => {
        // Only override if the API explicitly returns typed values
        // Never let an API 0 or undefined wipe out a valid optimistic count
        if (typeof data?.liked === "boolean") setLiked(data.liked);
        if (typeof data?.likeCount === "number" && data.likeCount > 0) {
          setLikeCount(data.likeCount);
        }
      },
    });
  }, [liked, likeCount, token, toggleLike]);

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

  const tags: string[] = item.tags ?? [];
  const vertical = item.vertical || item.category || "";

  const rawVideoUrl = item.videoUrl || item.video_url || "";
  const videoUrl = rawVideoUrl;
  const shareUrl = rawVideoUrl || `https://gigzito.com/listing/${item.id}`;

  // Resolve the best available poster image:
  // 1. YouTube thumbnail extracted from videoUrl
  // 2. Provider thumbUrl (if non-empty)
  // 3. Provider avatarUrl as last resort
  const ytVideoId = extractYoutubeId(rawVideoUrl);
  const ytThumb = ytVideoId ? `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg` : null;
  const poster =
    ytThumb ||
    resolveUrl(item.provider?.thumbUrl || item.thumbnailUrl || item.thumbnail_url || null) ||
    resolveUrl(item.provider?.avatarUrl || null);

  // Direct video playback for gigzito-hosted uploads.
  // On web, .mov (QuickTime) files cannot be decoded by Chrome/Firefox/Brave,
  // so we fall back to poster image for those. MP4 files play fine on all browsers.
  const gigzitoVideoUri = isGigzitoVideo(rawVideoUrl) ? resolveUrl(rawVideoUrl) : null;
  const isMovOnWeb = Platform.OS === "web" && !!gigzitoVideoUri?.match(/\.mov(\?|$)/i);
  const effectiveVideoUri = isMovOnWeb ? null : gigzitoVideoUri;

  // useVideoPlayer must be called unconditionally (Rules of Hooks).
  // Start muted — required so browser autoplay policy is satisfied.
  // We attempt to unmute right after play begins if the user wants sound.
  const player = useVideoPlayer(
    effectiveVideoUri ? { uri: effectiveVideoUri } : null,
    (p) => {
      p.loop = true;
      p.muted = true;
    }
  );

  // Play/pause whenever the active card or video source changes.
  // Sequence: force muted → play (satisfies autoplay policy) → apply desired mute state.
  // A 500 ms retry covers slow-loading sources that weren't ready on first attempt.
  const playRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muteApplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!effectiveVideoUri || !player) return;
    if (playRetryRef.current) clearTimeout(playRetryRef.current);
    if (muteApplyRef.current) clearTimeout(muteApplyRef.current);
    if (isActive) {
      const tryPlay = () => {
        try { player.muted = true; } catch {}        // muted first — autoplay
        try { player.play(); } catch {}
        // After play is initiated, apply the desired mute state.
        // Most browsers allow unmuting after play() has been called.
        muteApplyRef.current = setTimeout(() => {
          try { player.muted = muted; } catch {}
        }, 150);
      };
      tryPlay();
      playRetryRef.current = setTimeout(tryPlay, 500);
    } else {
      try { player.pause(); } catch {}
    }
    return () => {
      if (playRetryRef.current) clearTimeout(playRetryRef.current);
      if (muteApplyRef.current) clearTimeout(muteApplyRef.current);
    };
  }, [isActive, effectiveVideoUri]);

  // Keep the player's mute state in sync whenever the global muted prop changes.
  useEffect(() => {
    if (player && effectiveVideoUri) {
      try { player.muted = muted; } catch {}
    }
  }, [muted, effectiveVideoUri]);

  // Reset paused state every time this card becomes the active card.
  useEffect(() => {
    if (isActive) setPaused(false);
  }, [isActive]);

  // Send a postMessage command to the YouTube iframe player.
  // YouTube IFrame API requires args="" (empty string) not [].
  // Target must be "https://www.youtube.com" (not wildcard "*").
  const ytCommand = useCallback((func: string) => {
    try {
      ytIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args: "" }),
        "https://www.youtube.com"
      );
    } catch {}
  }, []);

  // Toggle play/pause for YouTube (postMessage/injectJavaScript) and gigzito MP4 (expo-video).
  const handlePlayPause = useCallback(() => {
    Haptics.selectionAsync();
    const willBePaused = !paused;
    setPaused(willBePaused);
    if (ytVideoId) {
      if (Platform.OS === "web") {
        ytCommand(willBePaused ? "pauseVideo" : "playVideo");
      } else {
        // Control the embedded YouTube WebView via the YouTube IFrame API
        const js = willBePaused
          ? `document.querySelector('iframe')?.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}','*'); true;`
          : `document.querySelector('iframe')?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}','*'); true;`;
        ytWebViewRef.current?.injectJavaScript(js);
      }
    } else if (player && effectiveVideoUri) {
      if (willBePaused) {
        if (playRetryRef.current) clearTimeout(playRetryRef.current);
        if (muteApplyRef.current) clearTimeout(muteApplyRef.current);
        try { player.pause(); } catch {}
      } else {
        try { player.play(); } catch {}
      }
    }
  }, [paused, ytVideoId, player, effectiveVideoUri, ytCommand]);

  // YouTube embed URL — for web iframe only.
  const ytEmbedSrc = ytVideoId
    ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${ytVideoId}&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1`
    : null;

  // For native WebView we inject a full HTML page so YouTube can't detect
  // the Android WebView user-agent and block playback.
  const ytWebViewHtml = ytVideoId
    ? `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    html,body{width:100%;height:100%;background:#000;overflow:hidden;}
    iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;}
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube.com/embed/${ytVideoId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${ytVideoId}&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1"
    allow="autoplay;fullscreen;encrypted-media"
    allowfullscreen
  ></iframe>
</body>
</html>`
    : null;

  return (
    <View style={[styles.card, { height: cardH }]}>
      {/* Background layer priority:
          1. YouTube iframe embed (web only, when we have a YT video ID)
          2. expo-video player (gigzito mp4 uploads)
          3. Static poster/thumbnail image
          4. Fallback dark placeholder */}
      {ytVideoId && ytEmbedSrc ? (
        // YouTube video — iframe on web, WebView on native.
        // Only mount when active so the inactive card's audio/video stops.
        isActive ? (
          Platform.OS === "web"
            ? React.createElement("iframe", {
                ref: ytIframeRef,
                key: ytVideoId,
                src: ytEmbedSrc,
                style: {
                  position: "absolute",
                  top: 0, left: 0,
                  width: "100%", height: "100%",
                  border: "none",
                  pointerEvents: "none",
                },
                allow: "autoplay; encrypted-media",
                allowFullScreen: false,
              })
            : (
              <WebView
                ref={ytWebViewRef}
                key={ytVideoId}
                source={{ html: ytWebViewHtml!, baseUrl: "https://www.youtube.com" }}
                style={styles.bg}
                originWhitelist={["*"]}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                pointerEvents="none"
              />
            )
        ) : poster ? (
          <Image source={{ uri: poster }} style={styles.bg} resizeMode="cover" />
        ) : (
          <View style={[styles.bg, styles.bgFallback]}>
            <Feather name="video" size={48} color={Colors.textMuted} />
          </View>
        )
      ) : effectiveVideoUri ? (
        <VideoView
          player={player}
          style={styles.bg}
          contentFit="cover"
          nativeControls={false}
        />
      ) : poster ? (
        <Image
          source={{ uri: poster }}
          style={styles.bg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.bg, styles.bgFallback]}>
          <Feather name="video" size={48} color={Colors.textMuted} />
        </View>
      )}

      {/* Invisible pressable layer — sits between image and gradient so FlatList scroll still works */}
      <Pressable
        accessible={false}
        onPressIn={() => setCardPressed(true)}
        onPressOut={() => setCardPressed(false)}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
        locations={[0.3, 0.6, 1]}
        style={styles.gradient}
      />

      {/* Hamburger — top left */}
      <HamburgerButton onPress={() => setMenuOpen(true)} />

      {/* Add Video + Go Live — side-by-side pill row, authenticated only */}
      {token ? (
        <View style={[styles.topPillRow, { top: insets.top + 12 }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/listing/create" as any); }}
            style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
          >
            <Feather name="plus" size={13} color="#fff" />
            <Text style={styles.pillText}>Add Video</Text>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); router.push("/live/go-live" as any); }}
            style={({ pressed }) => [styles.pill, styles.pillLive, pressed && styles.pillPressed]}
          >
            <View style={styles.liveDot} />
            <Text style={styles.pillText}>Go Live</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Duration timer — top right */}
      <View style={[styles.timerWrap, { top: insets.top + 12 }]}>
        <Feather name="clock" size={11} color={timerColor} />
        <Text style={[styles.timerText, { color: timerColor }]}>
          {formatTime(timeLeft)}
        </Text>
      </View>

      {/* Right rail buttons */}
      <View style={[styles.rightRail, { bottom: 200 + insets.bottom }]}>
        {/* GZGroups — top of rail */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/groups" as any); }}
          style={styles.gzGroupsRailBtn}
        >
          <Feather name="users" size={22} color="#60a5fa" />
        </Pressable>

        {/* GZFlash */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/gzflash" as any); }}
          style={styles.gzRailLogoBtn}
        >
          <Image
            source={require("@/assets/images/gz-flash-logo.png")}
            style={styles.gzRailLogo}
            resizeMode="cover"
          />
        </Pressable>

        {/* GeeZee Rolodex */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/geezee" as any); }}
          style={styles.gzRailLogoBtn}
        >
          <Image
            source={require("@/assets/images/gz-logo.png")}
            style={styles.gzRailLogo}
            resizeMode="cover"
          />
        </Pressable>

        {/* Mute */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); onMuteToggle(); }}
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
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={24}
              color={liked ? Colors.accent : "#fff"}
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

      {/* GZ Play/Pause — centered on the video, matches desktop main site design */}
      <Pressable onPress={handlePlayPause} style={styles.gzPlayPauseOuter}>
        {/* GZ logo — translucent bottom layer so video shows through */}
        <Image
          source={require("@/assets/images/gz-logo.png")}
          style={styles.gzPlayPauseLogo}
          resizeMode="cover"
        />
        {/* Overlay circle — dark + red ring when paused, fully transparent when playing */}
        <View
          style={[
            styles.gzPlayPauseCircle,
            paused
              ? { backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 2.5, borderColor: "rgba(255,43,43,0.8)" }
              : { backgroundColor: "transparent", borderWidth: 0 },
          ]}
        />
        {/* SVG icon absolutely centered on top */}
        <View style={styles.gzPlayPauseIconWrap} pointerEvents="none">
          {paused ? (
            <Svg width={28} height={28} viewBox="0 0 24 24" style={{ marginLeft: 3 }}>
              <Polygon points="5,3 19,12 5,21" fill="white" />
            </Svg>
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Rect x="5" y="4" width="4" height="16" rx="1" fill="rgba(255,255,255,0.6)" />
              <Rect x="15" y="4" width="4" height="16" rx="1" fill="rgba(255,255,255,0.6)" />
            </Svg>
          )}
        </View>
      </Pressable>

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
  topPillRow: {
    position: "absolute",
    top: 56,
    left: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillLive: {
    borderColor: Colors.live,
  },
  pillPressed: {
    opacity: 0.75,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  pillText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.live,
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
  gzPlayPauseOuter: {
    position: "absolute",
    top: SH / 2 - 50,
    left: SW / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.3,
  },
  gzPlayPauseCircle: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  gzPlayPauseLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  gzRailLogoBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    opacity: 0.3,
  },
  gzRailLogo: {
    width: 44,
    height: 44,
  },
  gzGroupsRailBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(96,165,250,0.15)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  gzPlayPauseIconWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
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
