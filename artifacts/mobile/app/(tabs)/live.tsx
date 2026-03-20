import React, { useState } from "react";
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
import * as Haptics from "expo-haptics";
import { NavigationMenu } from "@/components/NavigationMenu";
import { StreamCard } from "@/components/StreamCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { useZitoLiveStreams, useActiveStreams, useAllEyesUpcoming } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

function formatViewers(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`;
  return String(total);
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const {
    data: zitoStreams,
    isLoading: zitoLoading,
    refetch,
    isRefetching,
  } = useZitoLiveStreams();

  const { data: gigzitoStreams, isLoading: gigLoading } = useActiveStreams();
  const { data: upcoming } = useAllEyesUpcoming();

  const liveZito = (zitoStreams ?? []).filter((s: any) => s.isLive);
  const offlineZito = (zitoStreams ?? []).filter((s: any) => !s.isLive);

  const totalViewers = liveZito.reduce(
    (acc: number, s: any) => acc + (s.viewerCount ?? 0),
    0
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark }}>
      <ScrollView
        style={[styles.container, { paddingTop: topPad }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            tintColor={Colors.live}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburger}>
            <Feather name="menu" size={22} color={Colors.textPrimary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Live</Text>
              {liveZito.length > 0 ? (
                <LiveBadge label={`${liveZito.length} LIVE`} />
              ) : null}
            </View>
            <Text style={styles.subtitle}>
              {liveZito.length > 0
                ? `${formatViewers(totalViewers)} viewers across ${liveZito.length} stream${liveZito.length !== 1 ? "s" : ""}`
                : "Streams, Bookings & ZitoTV"}
            </Text>
          </View>
          {/* Go Live button — authenticated users only */}
          {user ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/live/go-live");
              }}
              style={styles.goLiveBtn}
            >
              <View style={styles.goLiveDot} />
              <Text style={styles.goLiveBtnText}>Go Live</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ── Zito.TV — Live Now ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ZitoTV — Live Now</Text>
            {liveZito.length > 0 && (
              <View style={styles.liveCountChip}>
                <View style={styles.liveDotSmall} />
                <Text style={styles.liveCountText}>{liveZito.length}</Text>
              </View>
            )}
          </View>

          {zitoLoading ? (
            <LoadingSpinner />
          ) : liveZito.length === 0 ? (
            <EmptyState
              icon="radio"
              title="No live streams right now"
              subtitle="Pull to refresh — streams appear here the moment someone goes live"
            />
          ) : (
            liveZito.map((item: any) => (
              <StreamCard key={item.id} item={item} />
            ))
          )}
        </View>

        {/* ── Gigzito Internal Live Sessions ── */}
        {(gigzitoStreams?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gigzito Sessions</Text>
            {gigLoading ? (
              <LoadingSpinner />
            ) : (
              (gigzitoStreams as any[]).map((item: any) => (
                <StreamCard key={item.id} item={{
                  ...item,
                  isLive: true,
                  name: item.provider?.displayName ?? item.title,
                  username: item.provider?.username,
                  avatarUrl: item.provider?.avatarUrl,
                  category: item.category,
                  streamUrl: item.streamUrl,
                  viewerCount: item.viewerCount ?? 0,
                }} />
              ))
            )}
          </View>
        ) : null}

        {/* ── All-Eyes Bookings ── */}
        {(upcoming?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All-Eyes Bookings</Text>
            {(upcoming as any[]).slice(0, 5).map((item: any) => (
              <View key={item.id} style={styles.bookingCard}>
                <Feather name="calendar" size={14} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingTitle}>
                    {item.title || item.name || "Booking"}
                  </Text>
                  {item.scheduledAt ? (
                    <Text style={styles.bookingTime}>
                      {new Date(item.scheduledAt).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── All ZitoTV Streamers ── */}
        {offlineZito.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Streamers</Text>
            <Text style={styles.sectionSubtitle}>
              Follow these creators — they'll appear at the top when they go live
            </Text>
            {offlineZito.map((item: any) => (
              <StreamCard key={item.id} item={item} compact />
            ))}
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <NavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  hamburger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.live,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: Colors.live,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  goLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  goLiveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: -8,
    marginBottom: 10,
  },
  liveCountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.live}18`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.live}44`,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveCountText: {
    color: Colors.live,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  bookingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 8,
  },
  bookingTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bookingTime: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
