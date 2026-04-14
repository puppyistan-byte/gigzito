import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGroup,
  useGroupMembers,
  useGroupWall,
  useGroupKanban,
  useGroupEvents,
  useGroupEndeavors,
  useGroupRetrospectives,
  useGroupWallets,
  useGroupWalletBalance,
  useGroupWalletContributions,
  usePostToGroupWall,
  useDeleteGroupWallPost,
  useUpdateKanbanCard,
  useDeleteKanbanCard,
  useCreateKanbanCard,
  useRemoveGroupMember,
  useSubmitRetrospective,
  useJoinRequestGroup,
  useDeleteGroupEvent,
  useUpdateEndeavor,
  useLogContribution,
  useDeleteGroup,
} from "@/hooks/useApi";
import Colors from "@/constants/colors";

const PURPLE = Colors.purple;

const SUB_TABS = ["Wall", "Members", "Kanban", "Events", "Endeavors", "Retros", "Wallets"] as const;
type SubTab = typeof SUB_TABS[number];

const STATUS_COLORS: Record<string, string> = {
  todo: Colors.textMuted,
  in_progress: "#facc15",
  done: Colors.success,
};
const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.textMuted,
  medium: "#facc15",
  high: Colors.danger,
};

// ─── Wall Tab ────────────────────────────────────────────────────────────────
function WallTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { user } = useAuth();
  const { data: posts = [], refetch, isRefetching } = useGroupWall(groupId);
  const postMutation = usePostToGroupWall(groupId);
  const deleteMutation = useDeleteGroupWallPost(groupId);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    postMutation.mutate(text, {
      onSuccess: () => setDraft(""),
      onError: () => Alert.alert("Error", "Could not post."),
    });
  };

  const confirmDelete = (postId: number) => {
    Alert.alert("Delete Post", "Remove this wall post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(postId, { onError: () => Alert.alert("Error", "Could not delete.") }),
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<EmptyHint icon="message-square" text="No posts yet. Be the first!" />}
        renderItem={({ item: post }) => {
          const canDelete = myRole === "admin" || post.authorUserId === (user as any)?.id;
          return (
            <View style={styles.wallPost}>
              <View style={styles.wallPostHeader}>
                <View style={styles.wallAuthorWrap}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{(post.authorName ?? "?")[0].toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.wallAuthor}>{post.authorName}</Text>
                    <Text style={styles.wallTime}>{formatDate(post.createdAt)}</Text>
                  </View>
                </View>
                {canDelete && (
                  <Pressable onPress={() => confirmDelete(post.id)}>
                    <Feather name="trash-2" size={15} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.wallContent}>{post.content}</Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.wallCompose}>
            <TextInput
              style={styles.wallInput}
              placeholder="Write something..."
              placeholderTextColor={Colors.textMuted}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <Pressable
              style={[styles.wallSendBtn, { opacity: draft.trim() ? 1 : 0.4 }]}
              onPress={submit}
              disabled={postMutation.isPending || !draft.trim()}
            >
              {postMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────
function MembersTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { data: members = [], refetch, isRefetching } = useGroupMembers(groupId);
  const removeMutation = useRemoveGroupMember(groupId);

  const confirmRemove = (m: any) => {
    Alert.alert("Remove Member", `Remove ${m.displayName} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMutation.mutate(m.userId, { onError: () => Alert.alert("Error", "Could not remove.") }),
      },
    ]);
  };

  return (
    <FlatList
      data={members}
      keyExtractor={(m) => String(m.userId)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListEmptyComponent={<EmptyHint icon="users" text="No members found." />}
      renderItem={({ item: m }) => (
        <View style={styles.memberRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{(m.displayName ?? "?")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.displayName}</Text>
            <Text style={styles.memberRole}>{m.role}</Text>
          </View>
          {myRole === "admin" && m.role !== "admin" && (
            <Pressable onPress={() => confirmRemove(m)} style={styles.removeBtn}>
              <Feather name="user-x" size={16} color={Colors.danger} />
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

// ─── Kanban Tab ───────────────────────────────────────────────────────────────
function KanbanTab({ groupId }: { groupId: string }) {
  const { data: cards = [], refetch, isRefetching } = useGroupKanban(groupId);
  const updateCard = useUpdateKanbanCard(groupId);
  const deleteCard = useDeleteKanbanCard(groupId);
  const createCard = useCreateKanbanCard(groupId);
  const [newTitle, setNewTitle] = useState("");

  const moveStatus = (cid: number, status: string) => {
    const next = status === "todo" ? "in_progress" : status === "in_progress" ? "done" : "todo";
    Haptics.selectionAsync();
    updateCard.mutate({ cid, status: next });
  };

  const confirmDelete = (cid: number) => {
    Alert.alert("Delete Card", "Delete this card?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCard.mutate(cid) },
    ]);
  };

  const addCard = () => {
    const t = newTitle.trim();
    if (!t) return;
    createCard.mutate({ title: t }, { onSuccess: () => setNewTitle("") });
  };

  const todo = cards.filter((c: any) => c.status === "todo");
  const inProg = cards.filter((c: any) => c.status === "in_progress");
  const done = cards.filter((c: any) => c.status === "done");

  const renderColumn = (label: string, status: string, items: any[]) => (
    <View style={styles.kanbanColumn} key={status}>
      <View style={[styles.kanbanColHeader, { borderColor: STATUS_COLORS[status] + "55" }]}>
        <View style={[styles.kanbanDot, { backgroundColor: STATUS_COLORS[status] }]} />
        <Text style={[styles.kanbanColTitle, { color: STATUS_COLORS[status] }]}>{label}</Text>
        <Text style={styles.kanbanCount}>{items.length}</Text>
      </View>
      {items.map((c: any) => (
        <Pressable key={c.id} style={styles.kanbanCard} onPress={() => moveStatus(c.id, c.status)}>
          <Text style={styles.kanbanCardTitle}>{c.title}</Text>
          {c.deadline && <Text style={styles.kanbanMeta}>Due {c.deadline}</Text>}
          <View style={styles.kanbanCardFooter}>
            {c.priority && (
              <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLORS[c.priority] + "22" }]}>
                <Text style={[styles.priorityText, { color: PRIORITY_COLORS[c.priority] }]}>{c.priority}</Text>
              </View>
            )}
            <Pressable onPress={() => confirmDelete(c.id)}>
              <Feather name="trash-2" size={13} color={Colors.textMuted} />
            </Pressable>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <View style={styles.wallCompose}>
        <TextInput
          style={[styles.wallInput, { minHeight: 42 }]}
          placeholder="New card title..."
          placeholderTextColor={Colors.textMuted}
          value={newTitle}
          onChangeText={setNewTitle}
        />
        <Pressable
          style={[styles.wallSendBtn, { opacity: newTitle.trim() ? 1 : 0.4 }]}
          onPress={addCard}
          disabled={createCard.isPending || !newTitle.trim()}
        >
          {createCard.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="plus" size={16} color="#fff" />
          )}
        </Pressable>
      </View>
      <Text style={styles.kanbanHint}>Tap a card to move it to the next column</Text>
      {renderColumn("To Do", "todo", todo)}
      {renderColumn("In Progress", "in_progress", inProg)}
      {renderColumn("Done", "done", done)}
      {cards.length === 0 && <EmptyHint icon="trello" text="No cards yet." />}
    </ScrollView>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { data: events = [], refetch, isRefetching } = useGroupEvents(groupId);
  const deleteMutation = useDeleteGroupEvent(groupId);

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={<EmptyHint icon="calendar" text="No events scheduled." />}
      renderItem={({ item: ev }) => (
        <View style={styles.eventCard}>
          <View style={styles.eventDateBox}>
            <Text style={styles.eventMonth}>{formatMonth(ev.startAt)}</Text>
            <Text style={styles.eventDay}>{formatDay(ev.startAt)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle}>{ev.title}</Text>
            <Text style={styles.eventTime}>{formatTime(ev.startAt)}{ev.endAt ? ` – ${formatTime(ev.endAt)}` : ""}</Text>
            {ev.description ? <Text style={styles.eventDesc}>{ev.description}</Text> : null}
          </View>
          {myRole === "admin" && (
            <Pressable onPress={() =>
              Alert.alert("Delete Event", "Delete this event?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(ev.id) },
              ])
            }>
              <Feather name="trash-2" size={15} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

// ─── Endeavors Tab ────────────────────────────────────────────────────────────
function EndeavorsTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { data: endeavors = [], refetch, isRefetching } = useGroupEndeavors(groupId);
  const updateMutation = useUpdateEndeavor(groupId);

  const bump = (eid: number, current: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateMutation.mutate({ eid, goalProgress: current + 1 });
  };

  return (
    <FlatList
      data={endeavors}
      keyExtractor={(e) => String(e.id)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={<EmptyHint icon="target" text="No endeavors yet." />}
      renderItem={({ item: e }) => (
        <View style={styles.endeavorCard}>
          <View style={styles.endeavorHeader}>
            <View style={styles.endeavorIcon}>
              <Feather name="target" size={16} color={PURPLE} />
            </View>
            <Text style={styles.endeavorTitle}>{e.title}</Text>
          </View>
          {e.description ? <Text style={styles.endeavorDesc}>{e.description}</Text> : null}
          <View style={styles.endeavorFooter}>
            <View style={styles.progressBadge}>
              <Feather name="trending-up" size={12} color={Colors.success} />
              <Text style={styles.progressText}>Progress: {e.goalProgress ?? 0}</Text>
            </View>
            {myRole === "admin" && (
              <Pressable style={styles.bumpBtn} onPress={() => bump(e.id, e.goalProgress ?? 0)}>
                <Feather name="plus" size={14} color={PURPLE} />
                <Text style={styles.bumpText}>Bump</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    />
  );
}

// ─── Retros Tab ───────────────────────────────────────────────────────────────
function RetrosTab({ groupId }: { groupId: string }) {
  const { data: retros = [], refetch, isRefetching } = useGroupRetrospectives(groupId);
  const submitMutation = useSubmitRetrospective(groupId);
  const [win, setWin] = useState("");
  const [roadblock, setRoadblock] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const submit = () => {
    if (!win.trim() || !roadblock.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitMutation.mutate(
      { win: win.trim(), roadblock: roadblock.trim() },
      {
        onSuccess: () => { setWin(""); setRoadblock(""); setFormOpen(false); },
        onError: () => Alert.alert("Error", "Could not submit."),
      }
    );
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <Pressable style={styles.retroToggle} onPress={() => setFormOpen((v) => !v)}>
        <Feather name={formOpen ? "chevron-up" : "edit-3"} size={16} color={PURPLE} />
        <Text style={styles.retroToggleText}>{formOpen ? "Cancel" : "Submit This Week's Retro"}</Text>
      </Pressable>

      {formOpen && (
        <View style={styles.retroForm}>
          <Text style={styles.retroLabel}>Win 🎉</Text>
          <TextInput
            style={styles.retroInput}
            placeholder="What went well?"
            placeholderTextColor={Colors.textMuted}
            value={win}
            onChangeText={setWin}
            multiline
          />
          <Text style={[styles.retroLabel, { marginTop: 10 }]}>Roadblock 🚧</Text>
          <TextInput
            style={styles.retroInput}
            placeholder="What held you back?"
            placeholderTextColor={Colors.textMuted}
            value={roadblock}
            onChangeText={setRoadblock}
            multiline
          />
          <Pressable
            style={[styles.retroSubmitBtn, { opacity: win.trim() && roadblock.trim() ? 1 : 0.4 }]}
            onPress={submit}
            disabled={submitMutation.isPending || !win.trim() || !roadblock.trim()}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.retroSubmitText}>Submit Retro</Text>
            )}
          </Pressable>
        </View>
      )}

      {retros.length === 0 && !formOpen && <EmptyHint icon="rotate-cw" text="No retrospectives yet." />}

      {retros.map((r: any) => (
        <View key={r.id} style={styles.retroCard}>
          <View style={styles.retroMeta}>
            <Text style={styles.retroAuthor}>{r.authorName}</Text>
            <Text style={styles.retroDate}>{formatDate(r.createdAt)}</Text>
          </View>
          <View style={styles.retroSection}>
            <Text style={styles.retroSectionLabel}>🎉 Win</Text>
            <Text style={styles.retroText}>{r.win}</Text>
          </View>
          <View style={[styles.retroSection, { marginTop: 8 }]}>
            <Text style={styles.retroSectionLabel}>🚧 Roadblock</Text>
            <Text style={styles.retroText}>{r.roadblock}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Wallets Tab ──────────────────────────────────────────────────────────────
function WalletCard({ groupId, wallet }: { groupId: string; wallet: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: balance } = useGroupWalletBalance(expanded ? groupId : "", expanded ? wallet.id : "");
  const { data: contributions = [] } = useGroupWalletContributions(expanded ? groupId : "", expanded ? wallet.id : "");
  const logMutation = useLogContribution(groupId, wallet.id);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [txHash, setTxHash] = useState("");

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || isNaN(a)) return;
    logMutation.mutate(
      { amount: a, currency: wallet.network, txHash: txHash.trim() || undefined, note: note.trim() || undefined },
      {
        onSuccess: () => { setAmount(""); setNote(""); setTxHash(""); },
        onError: () => Alert.alert("Error", "Could not log contribution."),
      }
    );
  };

  return (
    <View style={styles.walletCard}>
      <Pressable style={styles.walletHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.walletLeft}>
          <View style={styles.walletNetworkBadge}>
            <Text style={styles.walletNetworkText}>{wallet.network}</Text>
          </View>
          <View>
            <Text style={styles.walletLabel}>{wallet.label}</Text>
            <Text style={styles.walletAddr} numberOfLines={1}>{wallet.address}</Text>
          </View>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.textMuted} />
      </Pressable>

      {expanded && (
        <View style={styles.walletBody}>
          {balance && (
            <View style={styles.balanceRow}>
              <Feather name="dollar-sign" size={14} color={Colors.success} />
              <Text style={styles.balanceText}>
                {balance.balance} {balance.currency}
              </Text>
              {balance.cached && <Text style={styles.cachedText}>(cached)</Text>}
            </View>
          )}

          {wallet.link && (
            <Pressable onPress={() => Linking.openURL(wallet.link)} style={styles.explorerLink}>
              <Feather name="external-link" size={13} color={PURPLE} />
              <Text style={styles.explorerLinkText}>View on Explorer</Text>
            </Pressable>
          )}

          {contributions.length > 0 && (
            <View style={styles.contributionList}>
              <Text style={styles.contribHeader}>Contributions</Text>
              {contributions.slice(0, 5).map((c: any) => (
                <View key={c.id} style={styles.contribRow}>
                  <Text style={styles.contribName}>{c.displayName}</Text>
                  <View style={styles.contribRight}>
                    <Text style={styles.contribAmount}>{c.amount} {c.currency}</Text>
                    {c.verified && (
                      <View style={styles.verifiedBadge}>
                        <Feather name="check" size={10} color={Colors.success} />
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.logContrib}>
            <Text style={styles.contribHeader}>Log Contribution</Text>
            <TextInput
              style={styles.contribInput}
              placeholder={`Amount (${wallet.network})`}
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.contribInput}
              placeholder="Tx hash (optional)"
              placeholderTextColor={Colors.textMuted}
              value={txHash}
              onChangeText={setTxHash}
            />
            <TextInput
              style={styles.contribInput}
              placeholder="Note (optional)"
              placeholderTextColor={Colors.textMuted}
              value={note}
              onChangeText={setNote}
            />
            <Pressable
              style={[styles.contribSubmitBtn, { opacity: amount.trim() ? 1 : 0.4 }]}
              onPress={submit}
              disabled={logMutation.isPending || !amount.trim()}
            >
              {logMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.contribSubmitText}>Log Contribution</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function WalletsTab({ groupId, myRole }: { groupId: string; myRole: string }) {
  const { data: wallets = [], refetch, isRefetching } = useGroupWallets(groupId);

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {wallets.length === 0 && <EmptyHint icon="credit-card" text="No wallets added yet." />}
      {wallets.map((w: any) => (
        <WalletCard key={w.id} groupId={groupId} wallet={w} />
      ))}
    </ScrollView>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function EmptyHint({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={32} color={Colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" }).toUpperCase();
}
function formatDay(iso: string) {
  return new Date(iso).getDate().toString();
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SubTab>("Wall");
  const deleteGroup = useDeleteGroup();

  const { data: group, isLoading, error } = useGroup(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={PURPLE} size="large" />
      </View>
    );
  }

  if (error || !group) {
    const msg = (error as any)?.message ?? "";
    if (msg.includes("Private group") || msg.includes("403")) {
      return <PrivateGroupScreen groupId={id} />;
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load group.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const myRole = group.myRole ?? "";
  const isAdmin = myRole === "admin";

  const confirmDeleteGroup = () => {
    Alert.alert("Delete Group", `Delete "${group.name}" permanently? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteGroup.mutate(id, {
            onSuccess: () => router.replace("/(tabs)/groups" as any),
            onError: () => Alert.alert("Error", "Could not delete group."),
          }),
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.detailMeta}>{group.memberCount ?? 0} members · {group.isPrivate ? "Private" : "Public"}</Text>
        </View>

        {isAdmin && (
          <Pressable onPress={confirmDeleteGroup} style={styles.deleteIcon}>
            <Feather name="trash-2" size={17} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.subTabBar}
        contentContainerStyle={styles.subTabBarContent}
      >
        {SUB_TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.subTab, activeTab === tab && styles.subTabActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
          >
            <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === "Wall" && <WallTab groupId={id} myRole={myRole} />}
      {activeTab === "Members" && <MembersTab groupId={id} myRole={myRole} />}
      {activeTab === "Kanban" && <KanbanTab groupId={id} />}
      {activeTab === "Events" && <EventsTab groupId={id} myRole={myRole} />}
      {activeTab === "Endeavors" && <EndeavorsTab groupId={id} myRole={myRole} />}
      {activeTab === "Retros" && <RetrosTab groupId={id} />}
      {activeTab === "Wallets" && <WalletsTab groupId={id} myRole={myRole} />}
    </View>
  );
}

function PrivateGroupScreen({ groupId }: { groupId: string }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const requestMutation = useJoinRequestGroup(groupId);

  const submit = () => {
    if (message.trim().length < 50) {
      Alert.alert("Too short", "Please write at least 50 characters.");
      return;
    }
    requestMutation.mutate(message.trim(), {
      onSuccess: () => Alert.alert("Sent!", "Your join request has been sent to the group admin."),
      onError: (e: any) => Alert.alert("Error", e?.message ?? "Could not send request."),
    });
  };

  return (
    <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={[styles.backIcon, { position: "absolute", top: insets.top + 12, left: 16 }]}>
        <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
      </Pressable>
      <View style={styles.privateIcon}>
        <Feather name="lock" size={36} color={PURPLE} />
      </View>
      <Text style={styles.privateTitle}>Private Group</Text>
      <Text style={styles.privateBody}>Request to join — the admin will review your message.</Text>
      <TextInput
        style={styles.privateInput}
        placeholder="Introduce yourself (min. 50 characters)..."
        placeholderTextColor={Colors.textMuted}
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <Text style={styles.charCount}>{message.trim().length}/50 min</Text>
      <Pressable
        style={[styles.retroSubmitBtn, { width: "100%", opacity: message.trim().length >= 50 ? 1 : 0.4 }]}
        onPress={submit}
        disabled={requestMutation.isPending}
      >
        {requestMutation.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.retroSubmitText}>Send Join Request</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark },
  centered: { flex: 1, backgroundColor: Colors.dark, alignItems: "center", justifyContent: "center", padding: 24 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  detailTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  detailMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  deleteIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${Colors.danger}15`,
    alignItems: "center", justifyContent: "center",
  },
  subTabBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  subTabBarContent: {
    paddingHorizontal: 12,
    gap: 4,
    alignItems: "center",
  },
  subTab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: `${PURPLE}20`,
  },
  subTabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  subTabTextActive: {
    color: PURPLE,
    fontFamily: "Inter_700Bold",
  },
  wallPost: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 10,
  },
  wallPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wallAuthorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${PURPLE}33`,
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: {
    color: PURPLE,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  wallAuthor: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  wallTime: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  wallContent: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  wallCompose: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "flex-end",
  },
  wallInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 48,
    maxHeight: 120,
  },
  wallSendBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  memberName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  memberRole: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
    marginTop: 2,
  },
  removeBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: `${Colors.danger}15`,
    alignItems: "center", justifyContent: "center",
  },
  kanbanColumn: {
    gap: 8,
  },
  kanbanColHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  kanbanDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  kanbanColTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kanbanCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  kanbanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 6,
  },
  kanbanCardTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  kanbanMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  kanbanCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priorityPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  kanbanHint: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  eventCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "flex-start",
  },
  eventDateBox: {
    alignItems: "center",
    width: 44,
    backgroundColor: `${PURPLE}22`,
    borderRadius: 10,
    paddingVertical: 6,
  },
  eventMonth: {
    color: PURPLE,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  eventDay: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  eventTime: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  eventDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
    lineHeight: 18,
  },
  endeavorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
  },
  endeavorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  endeavorIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: `${PURPLE}22`,
    alignItems: "center", justifyContent: "center",
  },
  endeavorTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  endeavorDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  endeavorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  progressText: {
    color: Colors.success,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  bumpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${PURPLE}20`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bumpText: {
    color: PURPLE,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  retroToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${PURPLE}15`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${PURPLE}30`,
  },
  retroToggleText: {
    color: PURPLE,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  retroForm: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
  },
  retroLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  retroInput: {
    backgroundColor: Colors.dark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 70,
  },
  retroSubmitBtn: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  retroSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  retroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  retroMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  retroAuthor: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  retroDate: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  retroSection: {},
  retroSectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  retroText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  walletCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: "hidden",
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  walletNetworkBadge: {
    backgroundColor: `${PURPLE}25`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${PURPLE}40`,
  },
  walletNetworkText: {
    color: PURPLE,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  walletLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  walletAddr: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    maxWidth: 180,
  },
  walletBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    padding: 14,
    gap: 12,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.success}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  balanceText: {
    color: Colors.success,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cachedText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  explorerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explorerLinkText: {
    color: PURPLE,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  contributionList: {
    gap: 8,
  },
  contribHeader: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contribRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contribName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  contribRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contribAmount: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: `${Colors.success}25`,
    alignItems: "center", justifyContent: "center",
  },
  logContrib: {
    gap: 8,
  },
  contribInput: {
    backgroundColor: Colors.dark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  contribSubmitBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  contribSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  privateIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: `${PURPLE}22`,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  privateTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  privateBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
  privateInput: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    alignSelf: "flex-end",
  },
});
