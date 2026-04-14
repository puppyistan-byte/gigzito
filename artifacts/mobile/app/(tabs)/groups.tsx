import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
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
import {
  useMyGroups,
  useGroupInvites,
  useFeaturedGroups,
  useRespondToGroupInvite,
  useUserDashboard,
} from "@/hooks/useApi";
import { Avatar } from "@/components/ui/Avatar";
import { NavigationMenu, HamburgerButton } from "@/components/NavigationMenu";
import Colors from "@/constants/colors";

const PURPLE = "#60a5fa";

function UpgradePrompt() {
  return (
    <View style={styles.upgradeCentered}>
      <View style={styles.upgradeIconWrap}>
        <Feather name="users" size={40} color={PURPLE} />
      </View>
      <Text style={styles.upgradeTitle}>GZGroups</Text>
      <Text style={styles.upgradeBody}>
        Create and manage private groups with a shared wall, kanban board, calendar, goals, retros, and crypto wallets.
      </Text>
      <Text style={styles.upgradeTier}>Available from the GZGroups tier ($8/mo)</Text>
      <Pressable
        style={styles.upgradeBtn}
        onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)}
      >
        <Text style={styles.upgradeBtnText}>Upgrade on gigzito.com</Text>
      </Pressable>
    </View>
  );
}

function InviteCard({ invite }: { invite: any }) {
  const respond = useRespondToGroupInvite(invite.groupId);
  const loading = respond.isPending;

  const handle = (accept: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    respond.mutate(accept, {
      onError: () => Alert.alert("Error", "Could not respond to invite."),
    });
  };

  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteLeft}>
        <View style={styles.inviteIcon}>
          <Feather name="users" size={18} color={PURPLE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteGroup}>{invite.groupName}</Text>
          <Text style={styles.inviteFrom}>Invited by {invite.inviterName}</Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <Pressable
          style={[styles.inviteBtn, styles.inviteBtnDecline]}
          onPress={() => handle(false)}
          disabled={loading}
        >
          <Text style={styles.inviteBtnDeclineText}>Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.inviteBtn, styles.inviteBtnAccept]}
          onPress={() => handle(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.inviteBtnAcceptText}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function GroupCard({ group }: { group: any }) {
  const roleColor = group.myRole === "admin" ? Colors.purple : Colors.textMuted;
  return (
    <Pressable
      style={styles.groupCard}
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/groups/${group.id}` as any);
      }}
    >
      <View style={styles.groupCardLeft}>
        {group.coverUrl ? (
          <Image source={{ uri: group.coverUrl }} style={styles.groupAvatar} />
        ) : (
          <View style={[styles.groupAvatar, styles.groupAvatarPlaceholder]}>
            <Feather name="users" size={20} color={PURPLE} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.groupMeta}>
            <Text style={styles.groupMembers}>{group.memberCount ?? 0} members</Text>
            {group.myRole ? (
              <View style={[styles.rolePill, { backgroundColor: `${roleColor}22` }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{group.myRole}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: dashboard } = useUserDashboard();
  const hasGroups = dashboard?.unlocks?.hasGroups ?? false;

  const {
    data: groups,
    isLoading: groupsLoading,
    refetch: refetchGroups,
    isRefetching,
  } = useMyGroups();

  const { data: invites = [], refetch: refetchInvites } = useGroupInvites();
  const { data: featured = [] } = useFeaturedGroups();

  const onRefresh = () => {
    refetchGroups();
    refetchInvites();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <NavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <HamburgerButton onPress={() => setMenuOpen(true)} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Feather name="users" size={20} color={PURPLE} />
          </View>
          <Text style={styles.headerTitle}>GZGroups</Text>
          {invites.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{invites.length}</Text>
            </View>
          )}
        </View>
        {hasGroups && (
          <Pressable
            style={styles.createBtn}
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/groups/create" as any);
            }}
          >
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      {!hasGroups ? (
        <UpgradePrompt />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={PURPLE}
            />
          }
        >
          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
              {invites.map((inv: any) => (
                <InviteCard key={`${inv.groupId}`} invite={inv} />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Groups</Text>
            {groupsLoading ? (
              <ActivityIndicator color={PURPLE} style={{ marginTop: 24 }} />
            ) : !groups?.length ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No groups yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first group or join one below
                </Text>
                <Pressable
                  style={styles.emptyCreateBtn}
                  onPress={() => router.push("/groups/create" as any)}
                >
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyCreateBtnText}>Create Group</Text>
                </Pressable>
              </View>
            ) : (
              groups.map((g: any) => <GroupCard key={g.id} group={g} />)
            )}
          </View>

          {featured.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discover Groups</Text>
              {featured.map((g: any) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </View>
          )}

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PURPLE}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  groupCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  groupAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  groupAvatarPlaceholder: {
    backgroundColor: `${PURPLE}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupMembers: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rolePill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  inviteCard: {
    backgroundColor: `${PURPLE}10`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${PURPLE}33`,
    padding: 14,
    gap: 10,
  },
  inviteLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inviteIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${PURPLE}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteGroup: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  inviteFrom: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 10,
  },
  inviteBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnDecline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inviteBtnDeclineText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  inviteBtnAccept: {
    backgroundColor: PURPLE,
  },
  inviteBtnAcceptText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  upgradeCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  upgradeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${PURPLE}22`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  upgradeTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  upgradeBody: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  upgradeTier: {
    color: PURPLE,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  upgradeBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 8,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
