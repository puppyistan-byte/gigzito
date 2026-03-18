import React from "react";
import {
  Alert,
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
import { useMyProfile, useMyTotalLikes, useProfileCompletion, useMyListings, useMyGeemotions, useGeeZeeInbox } from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import Colors from "@/constants/colors";

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
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [menuStyles.item, pressed && menuStyles.pressed]}
    >
      <View style={menuStyles.left}>
        <View style={[menuStyles.iconBox, danger && menuStyles.dangerBox]}>
          <Feather name={icon} size={16} color={danger ? Colors.danger : Colors.accent} />
        </View>
        <Text style={[menuStyles.label, danger && menuStyles.dangerLabel]}>{label}</Text>
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const displayProfile = myProfile || profile;
  const displayName = displayProfile?.displayName || user?.email || "User";
  const username = displayProfile?.username;
  const tier = user?.subscriptionTier || "GZLurker";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => { logout(); router.replace("/auth/login"); } },
    ]);
  };

  const tierColor = tier === "GZLurker" ? Colors.textMuted
    : tier === "GZMarketer" ? Colors.teal
    : tier === "GZMarketerPro" ? Colors.accent
    : tier === "GZBusiness" ? Colors.success
    : Colors.live;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <Avatar uri={displayProfile?.avatarUrl} name={displayName} size={72} />
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

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Account</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="edit-2" label="Edit Profile" onPress={() => router.push("/profile/edit")} />
          <MenuItem icon="credit-card" label="Subscription" value={tier} />
          <MenuItem icon="users" label="My Audience" />
          <MenuItem icon="message-square" label="Inbox" value={inbox?.length ? String(inbox.length) : undefined} onPress={() => {}} />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Content</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="video" label="My Listings" value={String(myListings?.length ?? 0)} />
          <MenuItem icon="zap" label="My Geemotions" value={String(myGeemotions?.length ?? 0)} />
          <MenuItem icon="star" label="GeeZee Card" />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>Settings</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="lock" label="Change Password" />
          <MenuItem icon="log-out" label="Sign Out" onPress={handleLogout} danger />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { gap: 0 },
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
});
