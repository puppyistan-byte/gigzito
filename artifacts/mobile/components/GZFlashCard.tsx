import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const API_BASE = "https://www.gigzito.com";

function resolveUrl(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getZone(score: number) {
  if (score >= 90) return { label: "HOT",      color: "#F87171", bg: "rgba(127,29,29,0.4)"  };
  if (score >= 70) return { label: "TRENDING",  color: "#FB923C", bg: "rgba(124,45,18,0.4)"  };
  if (score >= 40) return { label: "ACTIVE",    color: "#FACC15", bg: "rgba(113,63,18,0.4)"  };
  return             { label: "COOL",       color: "#888888", bg: "rgba(40,40,40,0.4)"   };
}

function useCountdown(expiresAt: string) {
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const totalSecs = Math.floor(msLeft / 1000);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

type Props = {
  item: any;
  onClaim: (id: number) => void;
  claiming: boolean;
};

function CountdownDisplay({ expiresAt }: { expiresAt: string }) {
  const label = useCountdown(expiresAt);
  return (
    <View style={styles.urgencyRow}>
      <Feather name="clock" size={13} color="#60A5FA" />
      <Text style={styles.urgencyText}>{label} left</Text>
    </View>
  );
}

export function GZFlashCard({ item, onClaim, claiming }: Props) {
  const zone = getZone(item.potencyScore ?? 0);
  const flashPrice = item.retailPriceCents * (1 - item.discountPercent / 100);
  const slotsLeft = Math.max(0, (item.quantity ?? 0) - (item.claimedCount ?? 0));
  const artworkUri = resolveUrl(item.artworkUrl);
  const avatarUri = resolveUrl(item.avatarUrl);
  const scoreWidth = `${Math.min(100, item.potencyScore ?? 0)}%` as any;

  return (
    <View style={styles.card}>
      {/* Zone badge + seller row */}
      <View style={styles.topRow}>
        <View style={styles.sellerRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Feather name="user" size={12} color="#60A5FA" />
            </View>
          )}
          <Text style={styles.sellerName} numberOfLines={1}>
            {item.displayName || item.username || "Seller"}
          </Text>
        </View>
        <View style={[styles.zoneBadge, { backgroundColor: zone.bg }]}>
          <Text style={[styles.zoneText, { color: zone.color }]}>{zone.label}</Text>
        </View>
      </View>

      {/* Artwork */}
      {artworkUri ? (
        <Image source={{ uri: artworkUri }} style={styles.artwork} resizeMode="cover" />
      ) : null}

      {/* Inner content */}
      <View style={styles.inner}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={styles.flashPrice}>{formatCents(flashPrice)}</Text>
          <Text style={styles.retailPrice}>{formatCents(item.retailPriceCents)}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discountPercent}% OFF</Text>
          </View>
        </View>

        {/* Potency score bar */}
        <View style={styles.scoreBarWrap}>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: scoreWidth }]} />
          </View>
          <Text style={styles.scoreLabel}>
            Score {Math.round(item.potencyScore ?? 0)}
          </Text>
        </View>

        {/* Urgency indicator */}
        {item.displayMode === "countdown" ? (
          <CountdownDisplay expiresAt={item.expiresAt} />
        ) : (
          <View style={styles.urgencyRow}>
            <Feather name="layers" size={13} color="#60A5FA" />
            <Text style={styles.urgencyText}>
              {slotsLeft} of {item.quantity} slots left
            </Text>
          </View>
        )}

        {/* Claim button */}
        <Pressable
          onPress={() => { Haptics.impactAsync(); onClaim(item.id); }}
          disabled={claiming || slotsLeft === 0}
          style={[
            styles.claimBtn,
            (claiming || slotsLeft === 0) && styles.claimBtnDisabled,
          ]}
        >
          <Text style={styles.claimBtnText}>
            {slotsLeft === 0 ? "Sold Out" : claiming ? "Claiming…" : "Claim Deal"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#070d1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a2030",
    overflow: "hidden",
    marginHorizontal: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1D4ED8",
  },
  avatarFallback: {
    backgroundColor: "#0a1020",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerName: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  zoneBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  zoneText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  artwork: {
    width: "100%",
    height: 160,
  },
  inner: {
    padding: 14,
    gap: 10,
    backgroundColor: "#0a1020",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  flashPrice: {
    color: "#4ADE80",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  retailPrice: {
    color: "#888888",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#1E3A8A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    color: "#93C5FD",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  scoreBarWrap: {
    gap: 4,
  },
  scoreBarBg: {
    height: 4,
    backgroundColor: "#1a2030",
    borderRadius: 2,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 4,
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  scoreLabel: {
    color: "#60A5FA",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  urgencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urgencyText: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  claimBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnDisabled: {
    backgroundColor: "#1a2030",
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
