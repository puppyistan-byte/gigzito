import React, { useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGZFlash, useClaimFlash } from "@/hooks/useApi";
import { GZFlashCard } from "@/components/GZFlashCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingScreen";

export default function GZFlashScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: deals, isLoading, refetch, isRefetching } = useGZFlash();
  const { mutate: claim, isPending: claiming, variables: claimingId } = useClaimFlash();
  const [claimedIds, setClaimedIds] = useState<Set<number>>(new Set());

  const handleClaim = (id: number) => {
    Haptics.impactAsync();
    claim(id, {
      onSuccess: () => setClaimedIds((prev) => new Set(prev).add(id)),
    });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#60A5FA" />
        </Pressable>
        <Image
          source={require("@/assets/images/gz-flash-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>GZ Flash</Text>
          <Text style={styles.subtitle}>Limited-time deals, live now</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={deals ?? []}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={({ item }) => (
            <GZFlashCard
              item={item}
              onClaim={handleClaim}
              claiming={claiming && claimingId === item.id}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="zap"
              title="No Flash Deals Active"
              subtitle="Check back soon for limited-time offers"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#070d1a",
    borderWidth: 1,
    borderColor: "#1a2030",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 44,
    height: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: "#1a2030",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
    gap: 14,
  },
});
