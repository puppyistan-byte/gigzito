import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminDashboard, useAdminUsers, useAdminFlash } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

const ADMIN_PURPLE = "#9933FF";
const ADMIN_RED    = "#EF4444";
const ADMIN_AMBER  = "#F59E0B";
const ADMIN_GREEN  = "#22C55E";
const ADMIN_BLUE   = "#3B82F6";
const ADMIN_TEAL   = "#14B8A6";

function StatCard({
  label, value, icon, color, sub,
}: {
  label: string; value: string | number | undefined; icon: keyof typeof Feather.glyphMap;
  color: string; sub?: string;
}) {
  return (
    <View style={[s.statCard, { borderColor: `${color}44` }]}>
      <View style={[s.statIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value ?? "—"}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

function ActionTile({
  icon, label, sub, color, onPress,
}: {
  icon: keyof typeof Feather.glyphMap; label: string; sub?: string;
  color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [s.actionTile, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.actionIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
      {sub ? <Text style={s.actionSub}>{sub}</Text> : null}
    </Pressable>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <Feather name={icon} size={13} color={ADMIN_PURPLE} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function UserRow({ u, onPress }: { u: any; onPress: () => void }) {
  const tierColors: Record<string, string> = {
    GZLurker: Colors.textMuted,
    GZMarketer: Colors.teal,
    GZMarketerPro: ADMIN_PURPLE,
    GZBusiness: ADMIN_GREEN,
  };
  const tc = tierColors[u.subscriptionTier] ?? Colors.textMuted;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.userRow, pressed && { opacity: 0.7 }]}>
      <Avatar uri={u.avatarUrl} name={u.displayName || u.email} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={s.userName}>{u.displayName || u.email}</Text>
        <Text style={s.userEmail}>{u.email}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[s.userTier, { color: tc }]}>{u.subscriptionTier}</Text>
        <View style={[s.statusDot, { backgroundColor: u.status === "active" ? ADMIN_GREEN : ADMIN_RED }]} />
      </View>
    </Pressable>
  );
}

function FlashRow({ ad }: { ad: any }) {
  const score = ad.potencyScore ?? 0;
  const zoneColor = score >= 90 ? "#F87171" : score >= 70 ? "#FB923C" : score >= 40 ? "#FACC15" : "#888888";
  return (
    <View style={s.flashRow}>
      <View style={[s.flashScore, { backgroundColor: `${zoneColor}22`, borderColor: `${zoneColor}66` }]}>
        <Text style={[s.flashScoreText, { color: zoneColor }]}>{score}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.flashTitle} numberOfLines={1}>{ad.title ?? "Untitled"}</Text>
        <Text style={s.flashMeta}>
          {ad.claimedCount ?? 0}/{ad.quantity ?? "∞"} claimed
          {ad.discountPercent ? ` · ${ad.discountPercent}% off` : ""}
        </Text>
      </View>
      <Feather name="chevron-right" size={14} color={Colors.textMuted} />
    </View>
  );
}

export default function AdminPortalScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();

  const [userSearch, setUserSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: dash, isLoading: dashLoading } = useAdminDashboard();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(1, userSearch);
  const { data: flashAds, isLoading: flashLoading } = useAdminFlash();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      qc.invalidateQueries({ queryKey: ["admin-users"] }),
      qc.invalidateQueries({ queryKey: ["admin-flash"] }),
    ]);
    setRefreshing(false);
  };

  if (!isAdmin) {
    return (
      <View style={[s.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Feather name="shield-off" size={48} color={Colors.danger} />
        <Text style={s.denied}>Access Denied</Text>
        <Text style={s.deniedSub}>This area is restricted to administrators.</Text>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const users: any[] = usersData?.users ?? usersData?.data ?? (Array.isArray(usersData) ? usersData : []);
  const sortedFlash = [...(flashAds ?? [])].sort((a, b) => (b.potencyScore ?? 0) - (a.potencyScore ?? 0));

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.topBackBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.topTitleWrap}>
          <View style={s.adminBadge}>
            <Feather name="shield" size={12} color="#fff" />
            <Text style={s.adminBadgeText}>SUPERADMIN</Text>
          </View>
          <Text style={s.topTitle}>Admin Portal</Text>
        </View>
        <Pressable onPress={handleRefresh} style={s.topBackBtn}>
          <Feather name="refresh-cw" size={18} color={Colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ADMIN_PURPLE} />}
      >
        {/* Platform Stats */}
        <View style={s.panel}>
          <SectionHeader title="Platform Stats" icon="bar-chart-2" />
          {dashLoading ? (
            <View style={s.loadingWrap}><LoadingSpinner /></View>
          ) : (
            <View style={s.statsGrid}>
              <StatCard label="Total Users"    value={dash?.totalUsers}    icon="users"      color={ADMIN_BLUE} />
              <StatCard label="Active Flash"   value={dash?.activeFlash}   icon="zap"        color={ADMIN_AMBER} />
              <StatCard label="Providers"      value={dash?.totalProviders ?? dash?.providers} icon="briefcase" color={ADMIN_PURPLE} />
              <StatCard label="Listings"       value={dash?.totalListings ?? dash?.listings}  icon="list"       color={ADMIN_TEAL} />
              <StatCard label="Claimed Today"  value={dash?.claimedToday}  icon="check-circle" color={ADMIN_GREEN} />
              <StatCard label="Revenue"        value={dash?.totalRevenue ? `$${(dash.totalRevenue / 100).toFixed(0)}` : undefined} icon="dollar-sign" color={ADMIN_GREEN} sub="all time" />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={s.panel}>
          <SectionHeader title="Quick Actions" icon="grid" />
          <View style={s.actionsGrid}>
            <ActionTile icon="users"      label="Users"        sub="Manage accounts"  color={ADMIN_BLUE}   onPress={() => router.push("/profile/admin/users")} />
            <ActionTile icon="zap"        label="GZ Flash"     sub="Manage ads"       color={ADMIN_AMBER}  onPress={() => router.push("/profile/admin/flash")} />
            <ActionTile icon="video"      label="Content"      sub="Listings & posts" color={ADMIN_TEAL}   onPress={() => Linking.openURL("https://www.gigzito.com/admin/content")} />
            <ActionTile icon="star"       label="GeeZee"       sub="Cards & profiles" color={ADMIN_PURPLE} onPress={() => Linking.openURL("https://www.gigzito.com/admin/geezee")} />
            <ActionTile icon="mail"       label="Inbox"        sub="Support messages" color={ADMIN_GREEN}  onPress={() => Linking.openURL("https://www.gigzito.com/admin/inbox")} />
            <ActionTile icon="settings"   label="Settings"     sub="Platform config"  color="#64748B"      onPress={() => Linking.openURL("https://www.gigzito.com/admin/settings")} />
          </View>
        </View>

        {/* Recent Users */}
        <View style={s.panel}>
          <SectionHeader title="Users" icon="users" />
          <View style={s.searchWrap}>
            <Feather name="search" size={15} color={Colors.textMuted} style={{ marginLeft: 12 }} />
            <RNTextInput
              style={s.searchInput}
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Search by name or email…"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {usersLoading ? (
            <View style={s.loadingWrap}><LoadingSpinner /></View>
          ) : users.length === 0 ? (
            <Text style={s.emptyText}>No users found</Text>
          ) : (
            users.slice(0, 10).map((u: any) => (
              <UserRow key={u.id} u={u} onPress={() => {
                Haptics.selectionAsync();
                Alert.alert(
                  u.displayName || u.email,
                  `Role: ${u.role}\nTier: ${u.subscriptionTier}\nStatus: ${u.status}\nID: ${u.id}`,
                  [
                    { text: "Suspend", style: "destructive", onPress: () => {} },
                    { text: "View on Web", onPress: () => Linking.openURL(`https://www.gigzito.com/admin/users/${u.id}`) },
                    { text: "Cancel", style: "cancel" },
                  ]
                );
              }} />
            ))
          )}
          {users.length > 10 ? (
            <Pressable style={s.seeMore} onPress={() => Linking.openURL("https://www.gigzito.com/admin/users")}>
              <Text style={s.seeMoreText}>See all {usersData?.total ?? users.length} users →</Text>
            </Pressable>
          ) : null}
        </View>

        {/* GZFlash Overview */}
        <View style={s.panel}>
          <SectionHeader title="GZ Flash Ads" icon="zap" />
          {flashLoading ? (
            <View style={s.loadingWrap}><LoadingSpinner /></View>
          ) : sortedFlash.length === 0 ? (
            <Text style={s.emptyText}>No flash ads active</Text>
          ) : (
            sortedFlash.slice(0, 8).map((ad: any) => (
              <FlashRow key={ad.id} ad={ad} />
            ))
          )}
          {sortedFlash.length > 8 ? (
            <Pressable style={s.seeMore} onPress={() => Linking.openURL("https://www.gigzito.com/admin/flash")}>
              <Text style={s.seeMoreText}>See all {sortedFlash.length} ads →</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Web Admin Link */}
        <Pressable
          style={s.webAdminBtn}
          onPress={() => Linking.openURL("https://www.gigzito.com/admin")}
        >
          <Feather name="external-link" size={16} color={ADMIN_PURPLE} />
          <Text style={s.webAdminText}>Open Full Admin Dashboard</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  topBackBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  topTitleWrap: { flex: 1, gap: 2 },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
    backgroundColor: ADMIN_PURPLE, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  adminBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  topTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_700Bold" },
  scroll: { paddingHorizontal: 16, paddingBottom: 80, gap: 14 },

  panel: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  sectionIconWrap: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: `${ADMIN_PURPLE}18`, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  loadingWrap: { padding: 24, alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", padding: 20 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statCard: {
    width: "30%", flexGrow: 1, alignItems: "center", gap: 4,
    backgroundColor: Colors.darker, borderRadius: 12,
    borderWidth: 1, padding: 12,
  },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  statSub: { color: Colors.textMuted, fontSize: 10, fontFamily: "Inter_400Regular" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  actionTile: {
    width: "30%", flexGrow: 1, alignItems: "center", gap: 6,
    backgroundColor: Colors.darker, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.surfaceBorder, padding: 14,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: Colors.textPrimary, fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  actionSub: { color: Colors.textMuted, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    margin: 12, marginBottom: 4,
    backgroundColor: Colors.darker, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder, height: 40,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 10,
    color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_400Regular",
  },

  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  userName: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" },
  userEmail: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  userTier: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  flashRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  flashScore: {
    width: 38, height: 38, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  flashScoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  flashTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" },
  flashMeta: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular" },

  seeMore: { alignItems: "center", paddingVertical: 12 },
  seeMoreText: { color: ADMIN_PURPLE, fontSize: 13, fontFamily: "Inter_500Medium" },

  webAdminBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 16, borderRadius: 16,
    backgroundColor: `${ADMIN_PURPLE}15`, borderWidth: 1,
    borderColor: `${ADMIN_PURPLE}44`,
  },
  webAdminText: { color: ADMIN_PURPLE, fontSize: 15, fontFamily: "Inter_600SemiBold" },

  denied: { color: Colors.textPrimary, fontSize: 22, fontFamily: "Inter_700Bold" },
  deniedSub: { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular" },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.surface, borderRadius: 12 },
  backBtnText: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_500Medium" },
});
