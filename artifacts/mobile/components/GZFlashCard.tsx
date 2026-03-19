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
  if (score >= 90) return { label: "HOT",     color: "#F87171", bg: "rgba(127,29,29,0.5)",  stripe: "#F87171" };
  if (score >= 70) return { label: "TRENDING", color: "#FB923C", bg: "rgba(124,45,18,0.5)",  stripe: "#FB923C" };
  if (score >= 40) return { label: "ACTIVE",   color: "#FACC15", bg: "rgba(113,63,18,0.5)",  stripe: "#FACC15" };
  return             { label: "COOL",    color: "#888888", bg: "rgba(40,40,40,0.4)",   stripe: "#334155" };
}

function useCountdown(expiresAt: string) {
  const [msLeft, setMsLeft] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() =>
      setMsLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000
    );
    return () => clearInterval(id);
  }, [expiresAt]);

  const s = Math.floor(msLeft / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

export type CardSize = "full" | "medium" | "compact";

type Props = {
  item: any;
  onClaim: (id: number) => void;
  claiming: boolean;
  size: CardSize;
};

function CountdownDisplay({ expiresAt, tiny }: { expiresAt: string; tiny?: boolean }) {
  const label = useCountdown(expiresAt);
  return (
    <View style={s.urgencyRow}>
      <Feather name="clock" size={tiny ? 10 : 13} color="#60A5FA" />
      <Text style={[s.urgencyText, tiny && s.urgencyTextTiny]}>{label}</Text>
    </View>
  );
}

export function GZFlashCard({ item, onClaim, claiming, size }: Props) {
  const zone = getZone(item.potencyScore ?? 0);
  const flashPrice = item.retailPriceCents * (1 - item.discountPercent / 100);
  const slotsLeft = Math.max(0, (item.quantity ?? 0) - (item.claimedCount ?? 0));
  const artworkUri = resolveUrl(item.artworkUrl);
  const avatarUri = resolveUrl(item.avatarUrl);
  const scoreWidth = `${Math.min(100, item.potencyScore ?? 0)}%` as any;
  const sold = slotsLeft === 0;

  /* ── COMPACT (3-col) ── */
  if (size === "compact") {
    return (
      <View style={[s.card, s.cardCompact]}>
        {/* Zone stripe */}
        <View style={[s.stripe, { backgroundColor: zone.stripe }]} />
        {/* Zone badge */}
        <View style={[s.zoneBadge, { backgroundColor: zone.bg, alignSelf: "center", marginTop: 6 }]}>
          <Text style={[s.zoneText, { color: zone.color, fontSize: 8 }]}>{zone.label}</Text>
        </View>
        {/* Artwork */}
        {artworkUri ? (
          <Image source={{ uri: artworkUri }} style={s.artworkCompact} resizeMode="cover" />
        ) : null}
        <View style={[s.inner, { padding: 7, gap: 5 }]}>
          <Text style={s.titleCompact} numberOfLines={2}>{item.title}</Text>
          <Text style={s.flashPriceCompact}>{formatCents(flashPrice)}</Text>
          <View style={[s.discountBadge, { paddingHorizontal: 5, paddingVertical: 2 }]}>
            <Text style={[s.discountText, { fontSize: 9 }]}>{item.discountPercent}% OFF</Text>
          </View>
          {item.displayMode === "countdown"
            ? <CountdownDisplay expiresAt={item.expiresAt} tiny />
            : <View style={s.urgencyRow}>
                <Feather name="layers" size={10} color="#60A5FA" />
                <Text style={s.urgencyTextTiny}>{slotsLeft} left</Text>
              </View>
          }
          <Pressable
            onPress={() => { Haptics.impactAsync(); onClaim(item.id); }}
            disabled={claiming || sold}
            style={[s.claimBtn, s.claimBtnCompact, (claiming || sold) && s.claimBtnDisabled]}
          >
            <Text style={[s.claimBtnText, { fontSize: 10 }]}>
              {sold ? "Sold" : claiming ? "…" : "Claim"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ── MEDIUM (2-col) ── */
  if (size === "medium") {
    return (
      <View style={[s.card, s.cardMedium]}>
        <View style={[s.stripe, { backgroundColor: zone.stripe }]} />
        <View style={s.topRow}>
          <View style={s.sellerRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarSm} />
            ) : (
              <View style={[s.avatarSm, s.avatarFallback]}>
                <Feather name="user" size={9} color="#60A5FA" />
              </View>
            )}
            <Text style={s.sellerNameSm} numberOfLines={1}>
              {item.displayName || item.username || "Seller"}
            </Text>
          </View>
          <View style={[s.zoneBadge, { backgroundColor: zone.bg }]}>
            <Text style={[s.zoneText, { color: zone.color }]}>{zone.label}</Text>
          </View>
        </View>
        {artworkUri ? (
          <Image source={{ uri: artworkUri }} style={s.artworkMedium} resizeMode="cover" />
        ) : null}
        <View style={[s.inner, { padding: 10, gap: 7 }]}>
          <Text style={s.titleMedium} numberOfLines={2}>{item.title}</Text>
          <View style={s.priceRow}>
            <Text style={s.flashPriceMedium}>{formatCents(flashPrice)}</Text>
            <Text style={s.retailPrice}>{formatCents(item.retailPriceCents)}</Text>
          </View>
          <View style={[s.discountBadge, { alignSelf: "flex-start" }]}>
            <Text style={s.discountText}>{item.discountPercent}% OFF</Text>
          </View>
          <View style={s.scoreBarBg}>
            <View style={[s.scoreBarFill, { width: scoreWidth }]} />
          </View>
          {item.displayMode === "countdown"
            ? <CountdownDisplay expiresAt={item.expiresAt} tiny />
            : <View style={s.urgencyRow}>
                <Feather name="layers" size={11} color="#60A5FA" />
                <Text style={s.urgencyTextTiny}>{slotsLeft}/{item.quantity} left</Text>
              </View>
          }
          <Pressable
            onPress={() => { Haptics.impactAsync(); onClaim(item.id); }}
            disabled={claiming || sold}
            style={[s.claimBtn, s.claimBtnMedium, (claiming || sold) && s.claimBtnDisabled]}
          >
            <Text style={[s.claimBtnText, { fontSize: 12 }]}>
              {sold ? "Sold Out" : claiming ? "Claiming…" : "Claim Deal"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ── FULL (1-col) ── */
  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View style={s.sellerRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Feather name="user" size={12} color="#60A5FA" />
            </View>
          )}
          <Text style={s.sellerName} numberOfLines={1}>
            {item.displayName || item.username || "Seller"}
          </Text>
        </View>
        <View style={[s.zoneBadge, { backgroundColor: zone.bg }]}>
          <Text style={[s.zoneText, { color: zone.color }]}>{zone.label}</Text>
        </View>
      </View>
      {artworkUri ? (
        <Image source={{ uri: artworkUri }} style={s.artwork} resizeMode="cover" />
      ) : null}
      <View style={s.inner}>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        <View style={s.priceRow}>
          <Text style={s.flashPrice}>{formatCents(flashPrice)}</Text>
          <Text style={s.retailPrice}>{formatCents(item.retailPriceCents)}</Text>
          <View style={s.discountBadge}>
            <Text style={s.discountText}>{item.discountPercent}% OFF</Text>
          </View>
        </View>
        <View style={s.scoreBarWrap}>
          <View style={s.scoreBarBg}>
            <View style={[s.scoreBarFill, { width: scoreWidth }]} />
          </View>
          <Text style={s.scoreLabel}>Score {Math.round(item.potencyScore ?? 0)}</Text>
        </View>
        {item.displayMode === "countdown"
          ? <CountdownDisplay expiresAt={item.expiresAt} />
          : <View style={s.urgencyRow}>
              <Feather name="layers" size={13} color="#60A5FA" />
              <Text style={s.urgencyText}>{slotsLeft} of {item.quantity} slots left</Text>
            </View>
        }
        <Pressable
          onPress={() => { Haptics.impactAsync(); onClaim(item.id); }}
          disabled={claiming || sold}
          style={[s.claimBtn, (claiming || sold) && s.claimBtnDisabled]}
        >
          <Text style={s.claimBtnText}>
            {sold ? "Sold Out" : claiming ? "Claiming…" : "Claim Deal"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#070d1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1a2030",
    overflow: "hidden",
  },
  cardCompact: {
    borderRadius: 10,
  },
  cardMedium: {
    borderRadius: 12,
  },
  stripe: {
    height: 3,
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#1D4ED8",
  },
  avatarSm: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  sellerNameSm: {
    color: "#60A5FA",
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  zoneBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  zoneText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  artwork: {
    width: "100%",
    height: 160,
  },
  artworkMedium: {
    width: "100%",
    height: 90,
  },
  artworkCompact: {
    width: "100%",
    height: 56,
  },
  inner: {
    padding: 12,
    gap: 8,
    backgroundColor: "#0a1020",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  titleMedium: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    lineHeight: 16,
  },
  titleCompact: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 13,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  flashPrice: {
    color: "#4ADE80",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  flashPriceMedium: {
    color: "#4ADE80",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  flashPriceCompact: {
    color: "#4ADE80",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  retailPrice: {
    color: "#888888",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: "#1E3A8A",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  discountText: {
    color: "#93C5FD",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  scoreBarWrap: {
    gap: 3,
  },
  scoreBarBg: {
    height: 3,
    backgroundColor: "#1a2030",
    borderRadius: 2,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 3,
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
    gap: 5,
  },
  urgencyText: {
    color: "#60A5FA",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  urgencyTextTiny: {
    color: "#60A5FA",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  claimBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 9,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnMedium: {
    height: 34,
    borderRadius: 7,
  },
  claimBtnCompact: {
    height: 26,
    borderRadius: 6,
  },
  claimBtnDisabled: {
    backgroundColor: "#1a2030",
  },
  claimBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
