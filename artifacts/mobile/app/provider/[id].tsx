import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProviderProfile,
  useProviderWall,
  usePostToProviderWall,
  useProviderLoveStatus,
  useToggleLoveProvider,
  useFollowStatus,
  useToggleFollow,
  useProviderListings,
} from "@/hooks/useApi";

const API_BASE = "https://www.gigzito.com";

function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

const TIER_COLORS: Record<string, string> = {
  GZLurker: "#71717a",
  GZMarketer: "#60a5fa",
  GZMarketerPro: "#c084fc",
  GZBusiness: "#fbbf24",
  GZEnterprise: "#FFD700",
};

function tierColor(tier?: string) {
  return (tier && TIER_COLORS[tier]) ?? Colors.textMuted;
}

const TABS = ["ABOUT", "STORE FRONT", "WALL", "GEEZEE", "GZMUSIC"] as const;
type Tab = (typeof TABS)[number];

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("ABOUT");
  const [wallText, setWallText] = useState("");

  const { data: profile, isLoading } = useProviderProfile(id!);
  const profileUserId = profile?.userId ?? profile?.user?.id;
  const { data: followStatus } = useFollowStatus(Number(profileUserId));
  const { mutate: toggleFollow, isPending: followPending } = useToggleFollow(Number(profileUserId));
  const { data: loveStatus } = useProviderLoveStatus(id!);
  const { mutate: toggleLove, isPending: lovePending } = useToggleLoveProvider(id!);
  const { data: wallPosts = [], isLoading: wallLoading, refetch: refetchWall } = useProviderWall(id!);
  const { mutate: postToWall, isPending: postingWall } = usePostToProviderWall(id!);
  const { data: listings = [] } = useProviderListings(id!);

  const isOwn = user && profileUserId && String(user.id) === String(profileUserId);
  const isFollowing = followStatus?.following ?? false;
  const isLoved = loveStatus?.hasVoted ?? false;
  const loveCount = loveStatus?.voteCount ?? 0;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const handleFollow = () => {
    if (!token) { router.push("/auth/login"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFollow(isFollowing);
  };

  const handleLove = () => {
    if (!token) { router.push("/auth/login"); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleLove();
  };

  const handlePromote = () => {
    Haptics.selectionAsync();
    const url = `https://gigzito.com/provider/${id}`;
    Linking.openURL(url);
  };

  const handleWallPost = () => {
    if (!token) { router.push("/auth/login"); return; }
    if (!wallText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    postToWall(wallText.trim(), {
      onSuccess: () => { setWallText(""); refetchWall(); },
      onError: () => Alert.alert("Error", "Could not post to wall. Try again."),
    });
  };

  const handleWriteOnWall = () => {
    setActiveTab("WALL");
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.backBtnAbs}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.backBtnAbs}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Feather name="user-x" size={48} color={Colors.textMuted} />
        <Text style={styles.loadingText}>Profile not found</Text>
      </View>
    );
  }

  const avatarUri = resolveUrl(profile.avatarUrl ?? profile.profilePic);
  const displayName = profile.displayName ?? profile.username ?? "Unknown";
  const username = profile.username ? `@${profile.username}` : "";
  const tier = profile.user?.subscriptionTier ?? profile.subscriptionTier ?? profile.userTier;
  const tColor = tierColor(tier);
  const followerCount = followStatus?.followerCount ?? profile.followerCount ?? 0;
  const followingCount = followStatus?.followingCount ?? profile.followingCount ?? 0;

  const hasSocials = profile.instagramUrl || profile.tiktokUrl || profile.youtubeUrl || profile.twitterUrl;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        {profile.marketerOfMonth && (
          <View style={styles.motmBadge}>
            <Text style={styles.motmIcon}>👑</Text>
            <Text style={styles.motmText}>Marketer of the Month</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          {/* Avatar + identity row */}
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Feather name="user" size={32} color={Colors.textSecondary} />
                </View>
              )}
              <View style={[styles.avatarRing, { borderColor: tColor }]} />
            </View>

            <View style={styles.identityInfo}>
              <View style={styles.identityNameRow}>
                <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
              </View>
              {username ? (
                <Text style={styles.username}>{username}</Text>
              ) : null}
              <View style={styles.statsRow}>
                <Text style={styles.statVal}>{followerCount}</Text>
                <Text style={styles.statLabel}> followers</Text>
                <Text style={styles.statSep}>  </Text>
                <Text style={styles.statVal}>{followingCount}</Text>
                <Text style={styles.statLabel}> following</Text>
              </View>
            </View>

            <View style={styles.badgesCol}>
              {profile.primaryCategory ? (
                <View style={styles.nicheBadge}>
                  <Text style={styles.nicheBadgeText}>
                    {profile.primaryCategory.replace(/_/g, " ")}
                  </Text>
                </View>
              ) : null}
              {tier ? (
                <View style={[styles.tierBadge, { borderColor: tColor }]}>
                  <Text style={[styles.tierBadgeText, { color: tColor }]}>
                    {tier.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Bio */}
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Location */}
          {profile.location ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={13} color={Colors.textMuted} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          {!isOwn && (
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.followBtn,
                  isFollowing && styles.followingBtn,
                  pressed && { opacity: 0.8 },
                  followPending && { opacity: 0.6 },
                ]}
                onPress={handleFollow}
                disabled={followPending}
              >
                <Feather
                  name={isFollowing ? "user-check" : "user-plus"}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.actionBtnText}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.loveBtn,
                  isLoved && styles.lovedBtn,
                  pressed && { opacity: 0.8 },
                  lovePending && { opacity: 0.6 },
                ]}
                onPress={handleLove}
                disabled={lovePending}
              >
                <Ionicons
                  name={isLoved ? "heart" : "heart-outline"}
                  size={14}
                  color={isLoved ? "#fff" : Colors.accent}
                />
                <Text style={[styles.actionBtnText, !isLoved && { color: Colors.accent }]}>
                  {isLoved ? "Love shown!" : "Show Love"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.promoteBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handlePromote}
              >
                <Feather name="share-2" size={14} color={Colors.textSecondary} />
                <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>
                  Promote
                </Text>
              </Pressable>
            </View>
          )}

          {/* Write on Wall button */}
          {!isOwn && (
            <Pressable
              style={({ pressed }) => [styles.wallBtn, pressed && { opacity: 0.8 }]}
              onPress={handleWriteOnWall}
            >
              <Feather name="edit-3" size={15} color={Colors.textSecondary} />
              <Text style={styles.wallBtnText}>Write on Wall</Text>
            </Pressable>
          )}

          {/* Love count */}
          {loveCount > 0 ? (
            <Text style={styles.loveCountText}>
              {loveCount} {loveCount === 1 ? "person" : "people"} showed love this month
            </Text>
          ) : null}
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollWrap}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab);
                }}
                style={styles.tabItem}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === "ABOUT" && (
            <AboutTab profile={profile} hasSocials={!!hasSocials} tColor={tColor} tier={tier} />
          )}
          {activeTab === "STORE FRONT" && (
            <StoreFrontTab listings={listings} />
          )}
          {activeTab === "WALL" && (
            <WallTab
              wallPosts={wallPosts}
              wallLoading={wallLoading}
              wallText={wallText}
              setWallText={setWallText}
              onPost={handleWallPost}
              postingWall={postingWall}
              token={token}
              displayName={displayName}
              isOwn={!!isOwn}
            />
          )}
          {activeTab === "GEEZEE" && (
            <ComingSoonTab label="GeeZee card" icon="credit-card" onPress={() => router.push("/(tabs)/geezee")} />
          )}
          {activeTab === "GZMUSIC" && (
            <ComingSoonTab label="GZMusic tracks" icon="music" onPress={() => router.push("/(tabs)/gzmusic")} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function AboutTab({ profile, hasSocials, tColor, tier }: { profile: any; hasSocials: boolean; tColor: string; tier?: string }) {
  const socialLinks = [
    { key: "instagramUrl", icon: "instagram", label: "Instagram" },
    { key: "tiktokUrl", icon: "music", label: "TikTok" },
    { key: "youtubeUrl", icon: "youtube", label: "YouTube" },
    { key: "twitterUrl", icon: "twitter", label: "Twitter" },
    { key: "facebookUrl", icon: "facebook", label: "Facebook" },
  ];

  return (
    <View style={{ gap: 16 }}>
      {profile.bio ? (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutSectionLabel}>Bio</Text>
          <Text style={styles.aboutSectionText}>{profile.bio}</Text>
        </View>
      ) : null}

      {profile.location ? (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutSectionLabel}>Location</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Feather name="map-pin" size={14} color={Colors.textMuted} />
            <Text style={styles.aboutSectionText}>{profile.location}</Text>
          </View>
        </View>
      ) : null}

      {tier && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutSectionLabel}>Membership</Text>
          <Text style={[styles.aboutSectionText, { color: tColor, fontFamily: "Inter_700Bold" }]}>
            {tier}
          </Text>
        </View>
      )}

      {profile.primaryCategory && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutSectionLabel}>Niche</Text>
          <Text style={styles.aboutSectionText}>
            {profile.primaryCategory.replace(/_/g, " ")}
          </Text>
        </View>
      )}

      {hasSocials && (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutSectionLabel}>Socials</Text>
          <View style={{ gap: 10, marginTop: 6 }}>
            {socialLinks.map(({ key, icon, label }) => {
              const url = profile[key];
              if (!url) return null;
              return (
                <Pressable
                  key={key}
                  onPress={() => Linking.openURL(url)}
                  style={styles.socialLink}
                >
                  <Feather name={icon as any} size={16} color={Colors.accent} />
                  <Text style={styles.socialLinkText}>{label}</Text>
                  <Feather name="external-link" size={12} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {!profile.bio && !profile.location && !hasSocials && (
        <View style={styles.emptyState}>
          <Feather name="user" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>No profile info yet</Text>
        </View>
      )}
    </View>
  );
}

function StoreFrontTab({ listings }: { listings: any[] }) {
  if (!listings.length) {
    return (
      <View style={styles.emptyState}>
        <Feather name="shopping-bag" size={36} color={Colors.textMuted} />
        <Text style={styles.emptyStateText}>No listings yet</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {listings.map((item: any) => {
        const thumb =
          item.thumbnailUrl || item.thumbnail_url || item.provider?.thumbUrl || null;
        const resolvedThumb = thumb?.startsWith("http")
          ? thumb
          : thumb ? `https://www.gigzito.com${thumb}` : null;

        return (
          <Pressable
            key={item.id}
            style={styles.listingCard}
            onPress={() => router.push({ pathname: "/listing/[id]", params: { id: item.id } })}
          >
            {resolvedThumb ? (
              <Image source={{ uri: resolvedThumb }} style={styles.listingThumb} />
            ) : (
              <View style={[styles.listingThumb, styles.listingThumbFallback]}>
                <Feather name="video" size={22} color={Colors.textMuted} />
              </View>
            )}
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle} numberOfLines={2}>{item.title || "Untitled"}</Text>
              {item.vertical || item.category ? (
                <Text style={styles.listingCategory}>
                  {(item.vertical || item.category).replace(/_/g, " ")}
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

function WallTab({
  wallPosts,
  wallLoading,
  wallText,
  setWallText,
  onPost,
  postingWall,
  token,
  displayName,
  isOwn,
}: {
  wallPosts: any[];
  wallLoading: boolean;
  wallText: string;
  setWallText: (v: string) => void;
  onPost: () => void;
  postingWall: boolean;
  token: string | null;
  displayName: string;
  isOwn: boolean;
}) {
  return (
    <View style={{ gap: 16 }}>
      {/* Write box — only for logged in non-owners */}
      {token && !isOwn && (
        <View style={styles.wallBox}>
          <Text style={styles.wallBoxLabel}>WRITE ON THE WALL</Text>
          <TextInput
            style={styles.wallInput}
            placeholder={`Say something to ${displayName}…`}
            placeholderTextColor={Colors.textMuted}
            multiline
            value={wallText}
            onChangeText={(t) => setWallText(t.slice(0, 500))}
          />
          <View style={styles.wallInputFooter}>
            <Text style={styles.wallCharCount}>{wallText.length}/500</Text>
            <Pressable
              style={({ pressed }) => [
                styles.wallPostBtn,
                (!wallText.trim() || postingWall) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={onPost}
              disabled={!wallText.trim() || postingWall}
            >
              {postingWall ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={14} color="#fff" />
                  <Text style={styles.wallPostBtnText}>Post</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Wall posts */}
      {wallLoading ? (
        <ActivityIndicator color={Colors.accent} />
      ) : wallPosts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="message-square" size={36} color={Colors.textMuted} />
          <Text style={styles.emptyStateText}>No messages yet</Text>
          <Text style={styles.emptyStateSub}>
            Be the first to write on {displayName}'s wall!
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {wallPosts.map((post: any) => {
            const authorAvatar = resolveUrl(post.authorAvatar ?? post.author?.avatarUrl);
            return (
              <View key={post.id} style={styles.wallPost}>
                <View style={styles.wallPostHeader}>
                  {authorAvatar ? (
                    <Image source={{ uri: authorAvatar }} style={styles.wallAuthorAvatar} />
                  ) : (
                    <View style={[styles.wallAuthorAvatar, styles.wallAuthorAvatarFallback]}>
                      <Feather name="user" size={14} color={Colors.textMuted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wallAuthorName}>
                      {post.authorName ?? post.author?.displayName ?? post.author?.username ?? "Anonymous"}
                    </Text>
                    <Text style={styles.wallPostTime}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.wallPostContent}>{post.message ?? post.content}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ComingSoonTab({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Feather name={icon as any} size={36} color={Colors.textMuted} />
      <Text style={styles.emptyStateText}>{label}</Text>
      <Pressable style={styles.comingSoonBtn} onPress={onPress}>
        <Text style={styles.comingSoonBtnText}>Browse in App</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  backBtnAbs: {
    position: "absolute",
    top: 56,
    left: 16,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  motmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  motmIcon: {
    fontSize: 14,
  },
  motmText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  profileCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    gap: 12,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
    width: 72,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
  },
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  identityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  username: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statSep: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  badgesCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  nicheBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nicheBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  tierBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tierBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
  },
  followBtn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderColor: Colors.accent,
  },
  loveBtn: {
    backgroundColor: "transparent",
    borderColor: Colors.accent,
  },
  lovedBtn: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  promoteBtn: {
    backgroundColor: "transparent",
    borderColor: Colors.surfaceBorder,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  wallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignSelf: "flex-start",
  },
  wallBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loveCountText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  tabScrollWrap: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "relative",
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: Colors.textPrimary,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 14,
    height: 2,
    backgroundColor: Colors.accent,
    borderRadius: 1,
  },
  tabContent: {
    padding: 16,
  },
  aboutSection: {
    gap: 4,
  },
  aboutSectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  aboutSectionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  socialLinkText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  listingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  listingThumb: {
    width: 80,
    height: 60,
    backgroundColor: Colors.surfaceElevated,
  },
  listingThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  listingInfo: {
    flex: 1,
    paddingVertical: 10,
    gap: 4,
  },
  listingTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  listingCategory: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  wallBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 10,
  },
  wallBoxLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  wallInput: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    padding: 10,
  },
  wallInputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wallCharCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  wallPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wallPostBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  wallPost: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 8,
  },
  wallPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wallAuthorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  wallAuthorAvatarFallback: {
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  wallAuthorName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  wallPostTime: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  wallPostContent: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyStateText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  emptyStateSub: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  comingSoonBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  comingSoonBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
