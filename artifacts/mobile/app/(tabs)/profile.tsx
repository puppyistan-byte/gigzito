import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useMyTotalLikes, useProfileCompletion, useMyListings, useMyGeemotions, useGeeZeeInbox, useMyFlash, useDeleteFlash } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { NavigationMenu } from "@/components/NavigationMenu";
import Colors from "@/constants/colors";

const GZ_FLASH_TIERS = ["GZMarketerPro", "GZBusiness", "GZEnterprise"];
const GZ_CARD_TIERS  = ["GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];
const zitoTvLogo = require("@/assets/images/zitotv.png");

const TIER_ORDER = ["GZLurker", "GZMarketer", "GZMarketerPro", "GZBusiness", "GZEnterprise"];
const TIER_COLORS: Record<string, string> = {
  GZLurker:       "#71717a",
  GZMarketer:     "#60a5fa",
  GZMarketerPro:  "#c084fc",
  GZBusiness:     "#fbbf24",
  GZEnterprise:   "#FFD700",
};
const TIER_LABELS: Record<string, string> = {
  GZLurker:       "Lurker",
  GZMarketer:     "Marketer",
  GZMarketerPro:  "Marketer Pro",
  GZBusiness:     "Business",
  GZEnterprise:   "Enterprise",
};

const TIER_FEATURES: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  desc: string;
  minTier: string;
  accentColor: string;
}[] = [
  { icon: "user",         label: "GeeZee Card",       desc: "Social identity card",          minTier: "GZMarketer",    accentColor: "#60a5fa" },
  { icon: "video",        label: "Video Listings",     desc: "Post videos to the feed",       minTier: "GZMarketer",    accentColor: "#60a5fa" },
  { icon: "message-square", label: "Card Messaging",  desc: "Receive DMs on your card",      minTier: "GZMarketer",    accentColor: "#60a5fa" },
  { icon: "zap",          label: "GZFlash Ads",        desc: "Time-limited flash deals",      minTier: "GZMarketerPro", accentColor: "#c084fc" },
  { icon: "trending-up",  label: "Flash Analytics",    desc: "Potency scores & insights",     minTier: "GZMarketerPro", accentColor: "#c084fc" },
  { icon: "tv",           label: "ZitoTV Live",        desc: "Live stream to your audience",  minTier: "GZBusiness",    accentColor: "#fbbf24" },
  { icon: "star",         label: "Priority Support",   desc: "Dedicated account support",     minTier: "GZEnterprise",  accentColor: "#FFD700" },
];

function TierDashboard({ tier }: { tier: string }) {
  const tierIndex = TIER_ORDER.indexOf(tier);
  const color = TIER_COLORS[tier] ?? "#71717a";
  const label = TIER_LABELS[tier] ?? tier;

  return (
    <View style={tierStyles.wrapper}>
      <View style={tierStyles.headerRow}>
        <View style={tierStyles.headerLeft}>
          <View style={[tierStyles.tierDot, { backgroundColor: color }]} />
          <Text style={tierStyles.headerTitle}>Your Plan</Text>
        </View>
        <View style={[tierStyles.tierBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
          <Text style={[tierStyles.tierBadgeText, { color }]}>{label.toUpperCase()}</Text>
        </View>
      </View>

      <View style={tierStyles.card}>
        {TIER_FEATURES.map((feature, i) => {
          const featureIndex = TIER_ORDER.indexOf(feature.minTier);
          const unlocked = tierIndex >= featureIndex;
          return (
            <View key={feature.label} style={[tierStyles.featureRow, i < TIER_FEATURES.length - 1 && tierStyles.featureRowBorder]}>
              <View style={[tierStyles.featureIconWrap, { backgroundColor: unlocked ? `${feature.accentColor}22` : "#1A1A1A" }]}>
                <Feather name={feature.icon} size={14} color={unlocked ? feature.accentColor : Colors.textMuted} />
              </View>
              <View style={tierStyles.featureText}>
                <Text style={[tierStyles.featureLabel, !unlocked && tierStyles.featureLabelLocked]}>{feature.label}</Text>
                <Text style={tierStyles.featureDesc}>{feature.desc}</Text>
              </View>
              <View style={[tierStyles.featureStatus, { backgroundColor: unlocked ? "#00D9A522" : "#1A1A1A" }]}>
                {unlocked
                  ? <Feather name="check" size={12} color="#00D9A5" />
                  : <Feather name="lock" size={12} color={Colors.textMuted} />
                }
              </View>
            </View>
          );
        })}
      </View>

      {tier === "GZLurker" || tier === "GZMarketer" ? (
        <View style={tierStyles.upgradeRow}>
          <Feather name="arrow-up-circle" size={14} color={Colors.purple} />
          <Text style={tierStyles.upgradeText}>
            {tier === "GZLurker"
              ? "Upgrade to GZMarketer to unlock GeeZee Cards and more"
              : "Upgrade to GZMarketerPro to unlock GZFlash Ad Center"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const tierStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    gap: 1,
  },
  featureLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  featureLabelLocked: {
    color: Colors.textMuted,
  },
  featureDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  featureStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  upgradeText: {
    color: Colors.purple,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});

function ZitoTVBanner() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 1,    duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1,    duration: 700, useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.5,  duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Linking.openURL("https://zito.tv");
      }}
      style={({ pressed }) => [zitoStyles.banner, pressed && { opacity: 0.88 }]}
    >
      {/* Red glow behind logo */}
      <Animated.View style={[zitoStyles.glowRing, { opacity: glow }]} />

      <Image source={zitoTvLogo} style={zitoStyles.logo} resizeMode="contain" />

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={zitoStyles.heading}>Watch Live on ZitoTV</Text>
        <Text style={zitoStyles.sub}>Streams, shows & live events</Text>
      </View>

      {/* Pulsing LIVE badge */}
      <View style={zitoStyles.livePill}>
        <Animated.View style={[zitoStyles.liveDot, { transform: [{ scale: pulse }] }]} />
        <Text style={zitoStyles.liveText}>LIVE</Text>
      </View>

      <Feather name="external-link" size={14} color="rgba(255,80,80,0.7)" />
    </Pressable>
  );
}

function getZone(score: number) {
  if (score >= 90) return { label: "🔥 HOT",     color: "#F87171" };
  if (score >= 70) return { label: "📈 TRENDING", color: "#FB923C" };
  if (score >= 40) return { label: "⚡ ACTIVE",   color: "#3B82F6" };
  return             { label: "❄️ COOL",    color: "#888888" };
}

function useAdCountdown(expiresAt: string) {
  const calc = () => Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const [ms, setMs] = useState(calc);
  const ref = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    ref.current = setInterval(() => setMs(calc()), 1000);
    return () => clearInterval(ref.current);
  }, [expiresAt]);
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

function FlashAdRow({ ad, onEdit, onDelete }: { ad: any; onEdit: () => void; onDelete: () => void }) {
  const zone = getZone(ad.potencyScore ?? 0);
  const countdown = useAdCountdown(ad.expiresAt ?? new Date(Date.now() + 60000).toISOString());
  const remaining = (ad.quantity ?? 0) - (ad.claimedCount ?? 0);
  const statusColor = ad.status === "active" ? Colors.success : ad.status === "paused" ? Colors.accent : Colors.textMuted;

  return (
    <View style={fStyles.row}>
      <View style={[fStyles.zoneDot, { backgroundColor: zone.color }]} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={fStyles.title} numberOfLines={1}>{ad.title}</Text>
        <View style={fStyles.meta}>
          <Text style={[fStyles.zone, { color: zone.color }]}>{zone.label}</Text>
          <Text style={fStyles.separator}>·</Text>
          {ad.displayMode === "slots" ? (
            <Text style={fStyles.timer}>{remaining} slots left</Text>
          ) : (
            <Text style={fStyles.timer}>{countdown}</Text>
          )}
          <Text style={fStyles.separator}>·</Text>
          <Text style={[fStyles.status, { color: statusColor }]}>{ad.status}</Text>
        </View>
        {ad.discountPercent ? (
          <Text style={fStyles.discount}>{ad.discountPercent}% OFF</Text>
        ) : null}
      </View>
      <View style={fStyles.actions}>
        <Pressable onPress={onEdit} style={fStyles.actionBtn} hitSlop={8}>
          <Feather name="edit-2" size={14} color={Colors.textMuted} />
        </Pressable>
        <Pressable onPress={onDelete} style={[fStyles.actionBtn, { backgroundColor: `${Colors.danger}18` }]} hitSlop={8}>
          <Feather name="trash-2" size={14} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  zoneDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  zone: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  separator: { color: Colors.surfaceBorder, fontSize: 11 },
  timer: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },
  status: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  discount: {
    color: Colors.success,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
});

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

function MenuItem({
  icon,
  label,
  value,
  onPress,
  danger,
  accent,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  accent?: string;
}) {
  const iconColor = danger ? Colors.danger : accent ?? Colors.accent;
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [menuStyles.item, pressed && menuStyles.pressed]}
    >
      <View style={menuStyles.left}>
        <View style={[menuStyles.iconBox, danger && menuStyles.dangerBox, accent && { backgroundColor: `${accent}18` }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[menuStyles.label, danger && menuStyles.dangerLabel, accent && { color: accent }]}>{label}</Text>
      </View>
      <View style={menuStyles.right}>
        {value ? <Text style={menuStyles.value}>{value}</Text> : null}
        {!danger && <Feather name="chevron-right" size={16} color={Colors.textMuted} />}
      </View>
    </Pressable>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  pressed: { opacity: 0.8, backgroundColor: `${Colors.accent}08` },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${Colors.accent}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBox: { backgroundColor: `${Colors.danger}18` },
  label: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerLabel: { color: Colors.danger },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  value: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular" },
});

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: myProfile } = useMyProfile();
  const { data: likesData } = useMyTotalLikes();
  const { data: completion } = useProfileCompletion();
  const { data: myListings } = useMyListings();
  const { data: myGeemotions } = useMyGeemotions();
  const { data: inbox } = useGeeZeeInbox();
  const { data: myFlash } = useMyFlash();
  const { mutateAsync: deleteFlash } = useDeleteFlash();

  const [menuOpen, setMenuOpen] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const displayProfile = myProfile || profile;
  const displayName = displayProfile?.displayName || user?.email || "User";
  const username = displayProfile?.username;
  const tier = user?.subscriptionTier || "GZLurker";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleDeleteFlash = (id: number, title: string) => {
    Alert.alert("Delete Flash Ad", `Delete "${title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteFlash(id) },
    ]);
  };

  const flashUnlocked = GZ_FLASH_TIERS.includes(tier);

  const tierColor = TIER_COLORS[tier] ?? "#71717a";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark }}>
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenHeader}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburger}>
          <Feather name="menu" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Image source={require("@/assets/images/gigzito-logo.png")} style={styles.logoImage} resizeMode="contain" />
      </View>
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Avatar uri={displayProfile?.avatarUrl} name={displayName} size={72} />
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/listing/create"); }}
              style={styles.addVideoBtn}
            >
              <Feather name="plus" size={12} color="#fff" />
              <Text style={styles.addVideoBtnText}>Add Video</Text>
            </Pressable>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            {username ? <Text style={styles.username}>@{username}</Text> : null}
            <Badge label={tier} color={tierColor} bgColor={`${tierColor}22`} />
          </View>
        </View>

        {displayProfile?.bio ? (
          <Text style={styles.bio}>{displayProfile.bio}</Text>
        ) : null}

        {completion && !completion.isComplete ? (
          <View style={styles.completionBanner}>
            <Feather name="info" size={14} color={Colors.accent} />
            <Text style={styles.completionText}>
              Complete your profile: {completion.missing?.join(", ")}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatBox label="Likes" value={likesData?.total ?? likesData?.count ?? 0} />
          <StatBox label="Listings" value={myListings?.length ?? 0} />
          <StatBox label="Posts" value={myGeemotions?.length ?? 0} />
          <StatBox label="Messages" value={inbox?.length ?? 0} />
        </View>
      </View>

      <TierDashboard tier={tier} />

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="edit-2" label="Edit Profile" onPress={() => router.push("/profile/edit")} />
          <MenuItem icon="credit-card" label="Subscription" value={tier} />
          <MenuItem icon="users" label="My Audience" onPress={() => router.push("/profile/audience")} />
          <MenuItem icon="activity" label="Activity" onPress={() => router.push("/profile/activity")} accent={Colors.accent} />
          <MenuItem icon="message-square" label="Inbox" value={inbox?.length ? String(inbox.length) : undefined} onPress={() => router.push("/profile/inbox")} />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Content</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="video" label="My Listings" value={String(myListings?.length ?? 0)} onPress={() => router.push("/profile/my-listings")} />
          <MenuItem icon="zap" label="My Geemotions" value={String(myGeemotions?.length ?? 0)} onPress={() => router.push("/profile/my-geemotions")} />
          <MenuItem icon="credit-card" label="My GeeZee Card" onPress={() => router.push("/profile/my-gzcard")} />
          <MenuItem icon="edit-2" label="Edit GeeZee Card" onPress={() => router.push("/profile/edit-geezee")} />
        </View>
      </View>

      {/* ── ZitoTV Banner ── */}
      <View style={styles.menuSection}>
        <ZitoTVBanner />
      </View>

      {/* ── GZFlash Module ── */}
      <View style={styles.menuSection}>
        <View style={styles.gzFlashHeader}>
          <Feather name="zap" size={13} color="#3B82F6" />
          <Text style={styles.gzFlashHeaderText}>GZFlash Ad Center</Text>
          {flashUnlocked ? (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
            </View>
          ) : (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={10} color={Colors.textMuted} />
              <Text style={styles.lockedBadgeText}>PRO+</Text>
            </View>
          )}
        </View>

        {flashUnlocked ? (
          <View style={styles.menuCard}>
            {/* Create button */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/profile/gzflash-create"); }}
              style={({ pressed }) => [styles.gzFlashCreateBtn, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.gzFlashCreateLeft}>
                <View style={styles.gzFlashCreateIcon}>
                  <Feather name="plus" size={16} color="#3B82F6" />
                </View>
                <Text style={styles.gzFlashCreateText}>Create Flash Ad</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#3B82F6" />
            </Pressable>

            {/* My ads */}
            {myFlash && myFlash.length > 0 ? (
              myFlash.map((ad: any) => (
                <FlashAdRow
                  key={ad.id}
                  ad={ad}
                  onEdit={() => router.push({
                    pathname: "/profile/gzflash-create",
                    params: {
                      editId:       String(ad.id),
                      editTitle:    ad.title,
                      editArtwork:  ad.artworkUrl ?? "",
                      editPrice:    String(ad.retailPriceCents),
                      editDiscount: String(ad.discountPercent),
                      editQuantity: String(ad.quantity),
                      editDuration: String(ad.durationMinutes),
                      editMode:     ad.displayMode ?? "countdown",
                    },
                  })}
                  onDelete={() => handleDeleteFlash(ad.id, ad.title)}
                />
              ))
            ) : (
              <View style={styles.gzFlashEmpty}>
                <Feather name="zap" size={22} color="#3B82F6" style={{ opacity: 0.5 }} />
                <Text style={styles.gzFlashEmptyText}>No active flash ads.</Text>
                <Text style={styles.gzFlashEmptySub}>Tap "Create Flash Ad" to launch your first deal.</Text>
              </View>
            )}

            {/* Open full GZFlash module */}
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/gzflash"); }}
              style={({ pressed }) => [styles.gzFlashViewAll, pressed && { opacity: 0.8 }]}
            >
              <Feather name="external-link" size={14} color="#3B82F6" />
              <Text style={styles.gzFlashViewAllText}>Open GZFlash Ad Center</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.menuCard, styles.lockedCard]}>
            <View style={styles.lockedRow}>
              <View style={styles.lockedIconWrap}>
                <Feather name="lock" size={20} color={Colors.textMuted} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.lockedTitle}>Flash Ads unlock at GZMarketerPro</Text>
                <Text style={styles.lockedSub}>
                  Launch time-limited flash deals ranked by potency in the live GZFlash feed.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => Haptics.selectionAsync()}
              style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "SUPERUSER") ? (
        <View style={styles.menuSection}>
          <View style={styles.adminHeaderRow}>
            <View style={styles.adminBadge}>
              <Feather name="shield" size={11} color="#fff" />
              <Text style={styles.adminBadgeText}>SUPERADMIN</Text>
            </View>
          </View>
          <View style={styles.menuCard}>
            <MenuItem
              icon="settings"
              label="Admin Portal"
              onPress={() => router.push("/profile/admin")}
              accent="#9933FF"
            />
          </View>
        </View>
      ) : null}

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Security</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="shield"
            label="Password & MFA"
            onPress={() => router.push("/profile/security")}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Settings</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="log-out" label="Sign Out" onPress={handleLogout} danger />
        </View>
      </View>

      <Text style={styles.versionLabel}>Gigzito v1.0.2 (build 3)</Text>
    </ScrollView>
    <NavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  versionLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    paddingVertical: 20,
  },
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { gap: 0 },
  hamburger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  profileCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 20,
    gap: 14,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrap: {
    alignItems: "center",
    gap: 8,
  },
  addVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.danger,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addVideoBtnText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  profileInfo: { flex: 1, gap: 4 },
  displayName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  username: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  completionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${Colors.accent}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
    padding: 10,
  },
  completionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  menuHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  gzFlashHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  gzFlashHeaderText: {
    color: "#3B82F6",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  unlockedBadge: {
    backgroundColor: "rgba(0,217,165,0.15)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  unlockedBadgeText: {
    color: Colors.success,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lockedBadgeText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  gzFlashCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  gzFlashCreateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gzFlashCreateIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  gzFlashCreateText: {
    color: "#3B82F6",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  gzFlashEmpty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  gzFlashEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  gzFlashEmptySub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  gzFlashViewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  gzFlashViewAllText: {
    color: "#3B82F6",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  lockedCard: {
    padding: 16,
    gap: 14,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  lockedIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center", justifyContent: "center",
  },
  lockedTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  lockedSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 12,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  adminHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginLeft: 4,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#9933FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
});

const zitoStyles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0D0D0D",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.45)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: "hidden",
    position: "relative",
  },
  glowRing: {
    position: "absolute",
    left: -10,
    top: "50%",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(220,38,38,0.22)",
    marginTop: -35,
  },
  logo: {
    width: 64,
    height: 36,
  },
  heading: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(220,38,38,0.2)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    color: "#EF4444",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
});
