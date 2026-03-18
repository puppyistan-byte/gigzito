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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationMenu } from "@/components/NavigationMenu";
import { Feather } from "@expo/vector-icons";
import { useActiveStreams, useAllEyesUpcoming, useZitoTvEvents } from "@/hooks/useApi";
import { StreamCard } from "@/components/StreamCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { LiveBadge } from "@/components/ui/LiveBadge";
import Colors from "@/constants/colors";

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    data: streams,
    isLoading: streamsLoading,
    refetch: refetchStreams,
    isRefetching,
  } = useActiveStreams();
  const { data: upcoming, isLoading: upcomingLoading } = useAllEyesUpcoming();
  const { data: zitoEvents, isLoading: zitoLoading } = useZitoTvEvents();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark }}>
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={!!isRefetching} onRefresh={refetchStreams} tintColor={Colors.accent} />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburger}>
          <Feather name="menu" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Live</Text>
            {streams?.length ? <LiveBadge label={`${streams.length} LIVE`} /> : null}
          </View>
          <Text style={styles.subtitle}>Streams, Bookings & Zito TV</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Streams</Text>
        {streamsLoading ? (
          <LoadingSpinner />
        ) : !streams?.length ? (
          <EmptyState icon="radio" title="No live streams" subtitle="Check back soon" />
        ) : (
          streams.map((item: any) => <StreamCard key={item.id} item={item} />)
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All-Eyes Bookings</Text>
        {upcomingLoading ? (
          <LoadingSpinner />
        ) : !upcoming?.length ? (
          <EmptyState icon="calendar" title="No upcoming bookings" />
        ) : (
          upcoming.slice(0, 5).map((item: any) => (
            <View key={item.id} style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>{item.title || item.name || "Booking"}</Text>
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
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zito TV</Text>
        {zitoLoading ? (
          <LoadingSpinner />
        ) : !zitoEvents?.length ? (
          <EmptyState icon="tv" title="No TV events" />
        ) : (
          zitoEvents.slice(0, 5).map((item: any) => (
            <View key={item.id} style={styles.tvCard}>
              <Text style={styles.tvTitle}>{item.title || item.name || "Event"}</Text>
              {item.description ? (
                <Text style={styles.tvDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              {item.scheduledAt || item.startTime ? (
                <Text style={styles.tvTime}>
                  {new Date(item.scheduledAt || item.startTime).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
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
  content: {},
  hamburger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    marginTop: 4,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 8,
    gap: 4,
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
  },
  tvCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    marginBottom: 8,
    gap: 4,
  },
  tvTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  tvDesc: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tvTime: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
