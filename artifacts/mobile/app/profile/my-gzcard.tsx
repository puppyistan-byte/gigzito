import React from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMyGeeZeeCard } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const { width: SW } = Dimensions.get("window");
const API_BASE = "https://www.gigzito.com";
const CARD_WIDTH = Math.min(SW - 40, 380);

function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function buildQrUrl(qrUuid: string, size = 200): string {
  const data = encodeURIComponent(`https://gigzito.com/qr/${qrUuid}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=9933FF&bgcolor=111111&qzone=1&data=${data}`;
}

const TIER_COLORS: Record<string, string> = {
  GZLurker:      "#71717a",
  GZMarketer:    "#60a5fa",
  GZMarketerPro: "#c084fc",
  GZBusiness:    "#fbbf24",
  GZEnterprise:  "#FFD700",
};

const INTENT_LABEL: Record<string, string> = {
  marketing: "Marketing",
  social:    "Social",
  activity:  "Activity",
};

const GENDER_COLOR: Record<string, string> = {
  Female: "#f472b6",
  Male:   "#22d3ee",
  Other:  "#a78bfa",
};

const ALL_SOCIAL: { field: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { field: "facebookUrl",  icon: "facebook",        color: "#1877F2" },
  { field: "instagramUrl", icon: "instagram",       color: "#E1306C" },
  { field: "tiktokUrl",    icon: "music",           color: "#69C9D0" },
  { field: "youtubeUrl",   icon: "youtube",         color: "#FF0000" },
  { field: "twitterUrl",   icon: "twitter",         color: "#1DA1F2" },
  { field: "discordUrl",   icon: "message-circle",  color: "#5865F2" },
];

function ProfilePic({ uri, name, size }: { uri?: string | null; name: string; size: number }) {
  const resolved = resolveUrl(uri);
  const initials = name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
  return (
    <View style={[s.picWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={[s.picInitials, { fontSize: size * 0.35 }]}>{initials}</Text>
      )}
    </View>
  );
}

export default function MyGZCardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();
  const { data: card, isLoading } = useMyGeeZeeCard();

  const name       = card?.displayName || user?.displayName || user?.username || "My GZCard";
  const handle     = card?.username    || user?.username    || null;
  const slogan     = card?.slogan      || null;
  const tier       = card?.userTier    || user?.subscriptionTier || "GZLurker";
  const tierColor  = TIER_COLORS[tier]  ?? "#71717a";
  const intent     = INTENT_LABEL[card?.intent] ?? null;
  const ageBracket = card?.ageBracket  ?? null;
  const gender     = card?.gender      ?? null;
  const genderColor = GENDER_COLOR[gender] ?? Colors.purple;
  const qrUrl      = card?.qrUuid ? buildQrUrl(card.qrUuid, 220) : null;
  const profileUrl = card?.qrUuid ? `https://gigzito.com/qr/${card.qrUuid}` : null;
  const engagements = card?.engagementCount ?? 0;

  const linkedSocials = ALL_SOCIAL.filter(({ field }) => !!card?.[field]);

  const handleShare = async () => {
    if (!profileUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: `Check out my GeeZee card on Gigzito: ${profileUrl}` });
    } catch {}
  };

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={s.screenTitle}>My GZCard</Text>
        <Pressable
          onPress={() => router.push("/profile/edit-geezee")}
          style={s.editBtn}
        >
          <Feather name="edit-2" size={16} color={Colors.purple} />
          <Text style={s.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <View style={[s.card, { width: CARD_WIDTH }]}>
            <LinearGradient colors={["#1C1C1E", "#0E0E10"]} style={s.gradient}>
              {/* Tier stripe */}
              <View style={[s.tierStripe, { backgroundColor: tierColor }]} />

              {/* Header: pic + name + handle */}
              <View style={s.header}>
                <ProfilePic uri={card?.profilePic} name={name} size={82} />
                <View style={s.headerText}>
                  <Text style={s.name} numberOfLines={1}>{name}</Text>
                  {handle ? (
                    <Text style={[s.handle, { color: Colors.purple }]}>@{handle}</Text>
                  ) : null}
                  <View style={s.badgeRow}>
                    <View style={[s.badge, { borderColor: `${tierColor}66`, backgroundColor: `${tierColor}18` }]}>
                      <Text style={[s.badgeText, { color: tierColor }]}>{tier}</Text>
                    </View>
                    {intent ? (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{intent}</Text>
                      </View>
                    ) : null}
                    {gender ? (
                      <View style={[s.badge, { borderColor: `${genderColor}55`, backgroundColor: `${genderColor}15` }]}>
                        <Text style={[s.badgeText, { color: genderColor }]}>{gender}</Text>
                      </View>
                    ) : null}
                  </View>
                  {ageBracket ? (
                    <Text style={s.demo}>{ageBracket}</Text>
                  ) : null}
                </View>
              </View>

              {/* Slogan */}
              {slogan ? (
                <View style={s.sloganWrap}>
                  <Feather name="message-square" size={12} color={Colors.textMuted} style={{ marginTop: 2 }} />
                  <Text style={s.slogan}>"{slogan}"</Text>
                </View>
              ) : null}

              <View style={s.divider} />

              {/* QR Code — large, centered */}
              <View style={s.qrSection}>
                <Text style={s.qrLabel}>Scan to connect</Text>
                {qrUrl ? (
                  <View style={[s.qrFrame, { borderColor: `${tierColor}44` }]}>
                    <Image source={{ uri: qrUrl }} style={s.qrImage} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={s.qrPlaceholder}>
                    <Feather name="grid" size={40} color={Colors.textMuted} />
                    <Text style={s.qrMissingText}>Create your card to get a QR code</Text>
                  </View>
                )}
                {profileUrl ? (
                  <Text style={s.qrUrl} numberOfLines={1}>{profileUrl}</Text>
                ) : null}
              </View>

              <View style={s.divider} />

              {/* Social icons */}
              {linkedSocials.length > 0 ? (
                <View style={s.socialRow}>
                  {linkedSocials.map(({ field, icon, color }) => (
                    <View key={field} style={[s.socialIcon, { backgroundColor: `${color}22` }]}>
                      <Feather name={icon} size={16} color={color} />
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Footer: engagement + share */}
              <View style={s.footer}>
                <View style={s.engageStat}>
                  <Feather name="heart" size={14} color={Colors.purple} />
                  <Text style={s.engageText}>{engagements} engagements</Text>
                </View>
                <Image
                  source={require("@/assets/images/gz-logo.png")}
                  style={s.gzLogo}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Share button */}
        {profileUrl ? (
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="share-2" size={16} color="#fff" />
            <Text style={s.shareBtnText}>Share My GZCard</Text>
          </Pressable>
        ) : null}

        {!card && !isLoading ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>You don't have a GZCard yet.</Text>
            <Pressable onPress={() => router.push("/profile/edit-geezee")} style={s.createBtn}>
              <Text style={s.createBtnText}>Create My GZCard</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.dark },
  topBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:       { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: "center", justifyContent: "center" },
  screenTitle:   { flex: 1, color: Colors.textPrimary, fontSize: 20, fontFamily: "Inter_700Bold" },
  editBtn:       { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.purple, backgroundColor: `${Colors.purple}15` },
  editBtnText:   { color: Colors.purple, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  scroll:        { alignItems: "center", paddingBottom: 60, paddingTop: 12, gap: 20 },
  card:          { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: Colors.surfaceBorder },
  gradient:      { borderRadius: 20 },
  tierStripe:    { height: 4, width: "100%" },
  header:        { flexDirection: "row", alignItems: "flex-start", padding: 20, gap: 16 },
  picWrap:       { overflow: "hidden", borderWidth: 2.5, borderColor: Colors.purple, backgroundColor: Colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  picInitials:   { color: Colors.purple, fontFamily: "Inter_700Bold" },
  headerText:    { flex: 1, gap: 6, paddingTop: 2 },
  name:          { color: Colors.textPrimary, fontSize: 20, fontFamily: "Inter_700Bold" },
  handle:        { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badgeRow:      { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge:         { borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${Colors.surfaceBorder}30` },
  badgeText:     { color: Colors.textMuted, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  demo:          { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  sloganWrap:    { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  slogan:        { flex: 1, color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 20 },
  divider:       { height: 1, backgroundColor: Colors.surfaceBorder, marginHorizontal: 20 },
  qrSection:     { alignItems: "center", paddingVertical: 28, gap: 14 },
  qrLabel:       { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  qrFrame:       { padding: 12, borderRadius: 16, borderWidth: 1.5, backgroundColor: "#111111" },
  qrImage:       { width: 200, height: 200 },
  qrPlaceholder: { width: 200, height: 200, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 10 },
  qrMissingText: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 20 },
  qrUrl:         { color: Colors.textMuted, fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 0.2 },
  socialRow:     { flexDirection: "row", justifyContent: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 20, flexWrap: "wrap" },
  socialIcon:    { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  footer:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  engageStat:    { flexDirection: "row", alignItems: "center", gap: 6 },
  engageText:    { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_500Medium" },
  gzLogo:        { width: 42, height: 26, opacity: 0.7 },
  shareBtn:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.purple, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  shareBtnText:  { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  emptyWrap:     { alignItems: "center", gap: 14, marginTop: 20 },
  emptyText:     { color: Colors.textSecondary, fontSize: 15, fontFamily: "Inter_400Regular" },
  createBtn:     { backgroundColor: Colors.purple, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
