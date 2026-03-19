import React from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useMyAudience } from "@/hooks/useApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Avatar } from "@/components/ui/Avatar";
import Colors from "@/constants/colors";

const API_BASE = "https://www.gigzito.com";

function resolveImage(uri?: string | null) {
  if (!uri) return null;
  if (uri.startsWith("http")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

function AudienceMember({ member }: { member: any }) {
  const name = member.displayName || member.username || `User #${member.userId ?? member.id}`;
  const handle = member.username ? `@${member.username}` : null;
  const tier = member.subscriptionTier || member.userTier;
  const joinedAt = member.followedAt || member.createdAt;

  const TIER_COLORS: Record<string, string> = {
    GZLurker:      "#71717a",
    GZMarketer:    "#60a5fa",
    GZMarketerPro: "#c084fc",
    GZBusiness:    "#fbbf24",
    GZEnterprise:  "#FFD700",
  };
  const tierColor = TIER_COLORS[tier] ?? Colors.textMuted;

  return (
    <View style={s.memberRow}>
      <Avatar
        uri={resolveImage(member.avatarUrl)}
        name={name}
        size={44}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.memberName}>{name}</Text>
        {handle ? <Text style={s.memberHandle}>{handle}</Text> : null}
        {joinedAt ? <Text style={s.memberJoined}>Joined {timeAgo(joinedAt)}</Text> : null}
      </View>
      {tier ? (
        <View style={[s.tierChip, { borderColor: `${tierColor}44`, backgroundColor: `${tierColor}15` }]}>
          <Text style={[s.tierText, { color: tierColor }]}>{tier}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AudienceScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: audience, isLoading, refetch, isRefetching } = useMyAudience();

  if (isLoading) return <LoadingScreen />;

  const members: any[] = audience ?? [];

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>My Audience</Text>
          <Text style={s.subtitle}>
            {members.length > 0 ? `${members.length} follower${members.length !== 1 ? "s" : ""}` : "People who follow you"}
          </Text>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{members.length}</Text>
        </View>
      </View>

      {members.length > 0 ? (
        <View style={s.statsBar}>
          <View style={s.stat}>
            <Text style={s.statNum}>{members.length}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>
              {members.filter((m: any) => {
                const t = m.subscriptionTier || m.userTier;
                return t && t !== "GZLurker";
              }).length}
            </Text>
            <Text style={s.statLabel}>Paid Tiers</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>
              {members.filter((m: any) => {
                const joined = m.followedAt || m.createdAt;
                if (!joined) return false;
                return Date.now() - new Date(joined).getTime() < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </Text>
            <Text style={s.statLabel}>This Week</Text>
          </View>
        </View>
      ) : null}

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
        {members.length === 0 ? (
          <EmptyState
            icon="users"
            title="No audience yet"
            subtitle="When people follow your GeeZee card, they'll appear here"
          />
        ) : (
          <View style={s.card}>
            {members.map((member: any, i: number) => (
              <View key={member.userId ?? member.id ?? i}>
                <AudienceMember member={member} />
              </View>
            ))}
          </View>
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
  countBadge: {
    minWidth: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 10,
  },
  countBadgeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.surfaceBorder,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  memberName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  memberHandle: {
    color: Colors.purple,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  memberJoined: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  tierChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
