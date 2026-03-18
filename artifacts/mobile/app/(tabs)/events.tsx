import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigJacksActive, useGigJacksToday, useLiveState } from "@/hooks/useApi";
import { GigJackCard } from "@/components/GigJackCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { NavigationMenu } from "@/components/NavigationMenu";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: activeEvents, isLoading: activeLoading, refetch: refetchActive, isRefetching } = useGigJacksActive();
  const { data: todayEvents, isLoading: todayLoading, refetch: refetchToday } = useGigJacksToday();
  const { data: liveState } = useLiveState();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const isFlashLive = liveState?.live || liveState?.flash;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark }}>
    <ScrollView
      style={[styles.container, { paddingTop: topPad }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={!!isRefetching}
          onRefresh={() => { refetchActive(); refetchToday(); }}
          tintColor={Colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburger}>
          <Feather name="menu" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>GigJack Events</Text>
            {isFlashLive ? <LiveBadge label="FLASH" /> : null}
          </View>
          <Text style={styles.subtitle}>Flash events & live siren alerts</Text>
        </View>
      </View>

      {isFlashLive ? (
        <View style={styles.sirenBanner}>
          <Text style={styles.sirenText}>Flash Event is Live Now!</Text>
          <Text style={styles.sirenSub}>Act fast — limited time offer</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Now</Text>
        {activeLoading ? (
          <LoadingSpinner />
        ) : !activeEvents?.length ? (
          <EmptyState icon="zap" title="No active events" subtitle="Check back soon for flash events" />
        ) : (
          activeEvents.map((item: any) => (
            <GigJackCard key={item.id} item={item} isLive />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Events</Text>
        {todayLoading ? (
          <LoadingSpinner />
        ) : !todayEvents?.length ? (
          <EmptyState icon="calendar" title="No events today" subtitle="Events will appear here when scheduled" />
        ) : (
          todayEvents.map((item: any) => (
            <GigJackCard key={item.id} item={item} />
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
  content: {
    gap: 0,
  },
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
  sirenBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: `${Colors.live}25`,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.live,
    padding: 16,
    gap: 4,
  },
  sirenText: {
    color: Colors.live,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sirenSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    marginTop: 8,
  },
});
