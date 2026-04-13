import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAudioPlayer } from "expo-audio";

import { useGZ100, useGZLibrary, useGZToggleLike, useGZRecordPlay } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { NavigationMenu } from "@/components/NavigationMenu";

const GZ = {
  orange: "#ff7a00",
  orangeDim: "#ff7a0020",
  orangeBorder: "#ff7a0040",
  bg: "#000000",
  card: "#0b0b0b",
  surface: "#111111",
  txt: "#ffffff",
  txt2: "#888888",
  muted: "#555555",
};

const API_BASE = "https://www.gigzito.com";
const { width: SW } = Dimensions.get("window");

function coverUri(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

function audioUri(track: any): string | null {
  const u = track?.fileUrl || track?.audioUrl;
  if (!u) return null;
  if (u.startsWith("http")) return u;
  return `${API_BASE}${u}`;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 6 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array(full).fill(0).map((_, i) => (
        <Ionicons key={`f${i}`} name="star" size={size} color={GZ.orange} />
      ))}
      {half && <Ionicons name="star-half" size={size} color={GZ.orange} />}
      {Array(empty).fill(0).map((_, i) => (
        <Ionicons key={`e${i}`} name="star-outline" size={size} color={GZ.muted} />
      ))}
    </View>
  );
}

interface PlayingTrack {
  id: number;
  title: string;
  artist: string;
  coverUrl: string | null;
}

export default function GZMusicScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [playingTrack, setPlayingTrack] = useState<PlayingTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: chart, isLoading: chartLoading, refetch: refetchChart } = useGZ100();
  const { data: library, isLoading: libLoading, refetch: refetchLib } = useGZLibrary(searchMode && query.length > 1 ? query : undefined);
  const toggleLike = useGZToggleLike();
  const recordPlay = useGZRecordPlay();

  const listData = searchMode ? (library ?? []) : (chart ?? []);
  const isLoading = searchMode ? libLoading : chartLoading;


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (searchMode) await refetchLib();
    else await refetchChart();
    setRefreshing(false);
  }, [searchMode, refetchChart, refetchLib]);

  function handlePlay(track: any) {
    const uri = audioUri(track);
    if (!uri) return;
    if (playingTrack?.id === track.id) {
      if (isPlaying) { player.pause(); setIsPlaying(false); }
      else { player.play(); setIsPlaying(true); }
      return;
    }
    try {
      player.replace({ uri });
      player.play();
      setPlayingTrack({ id: track.id, title: track.title, artist: track.artist, coverUrl: coverUri(track.coverUrl) });
      setIsPlaying(true);
      recordPlay.mutate(track.id);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  function stopPlayer() {
    player.pause();
    setPlayingTrack(null);
    setIsPlaying(false);
  }

  function handleLike(track: any) {
    if (!token) { router.push("/auth/login"); return; }
    toggleLike.mutate(track.id);
  }

  const renderTrack = useCallback(({ item, index }: { item: any; index: number }) => {
    const cover = coverUri(item.coverUrl);
    const liked = item.liked ?? false;
    const isThisPlaying = playingTrack?.id === item.id && isPlaying;

    return (
      <Pressable
        style={styles.trackCard}
        onPress={() => router.push(`/gzmusic/${item.id}` as any)}
      >
        <Text style={styles.rankNum}>{index + 1}</Text>
        <View style={styles.coverWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Ionicons name="musical-notes" size={22} color={GZ.orange} />
            </View>
          )}
        </View>
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.trackGenre} numberOfLines={1}>{item.genre}</Text>
          {item.avgRating > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
              <StarRating rating={item.avgRating} size={10} />
              <Text style={styles.ratingLabel}>{item.avgRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.trackActions}>
          <Pressable
            style={[styles.playBtn, isThisPlaying && styles.playBtnActive]}
            onPress={() => handlePlay(item)}
          >
            <Ionicons
              name={isThisPlaying ? "pause" : "play"}
              size={16}
              color={isThisPlaying ? GZ.bg : GZ.orange}
            />
          </Pressable>
          <Pressable style={styles.likeBtn} onPress={() => handleLike(item)}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={16}
              color={liked ? GZ.orange : GZ.txt2}
            />
            <Text style={styles.likeCount}>{item.likeCount || 0}</Text>
          </Pressable>
          <Pressable
            style={styles.commentBtn}
            onPress={() => router.push(`/gzmusic/${item.id}` as any)}
          >
            <Ionicons name="chatbubble-outline" size={14} color={GZ.muted} />
            {item.commentCount > 0 && (
              <Text style={styles.likeCount}>{item.commentCount}</Text>
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  }, [playingTrack, isPlaying]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <NavigationMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          <Feather name="menu" size={22} color={GZ.txt} />
        </Pressable>
        <View style={styles.headerBrand}>
          <Ionicons name="musical-notes" size={20} color={GZ.orange} />
          <Text style={styles.headerTitle}>GZMusic</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconBtn, searchMode && { backgroundColor: GZ.orangeDim }]}
            onPress={() => { setSearchMode(!searchMode); setQuery(""); }}
          >
            <Feather name={searchMode ? "x" : "search"} size={18} color={searchMode ? GZ.orange : GZ.txt2} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/gzmusic/upload" as any)}
          >
            <Feather name="upload" size={18} color={GZ.txt2} />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      {searchMode && (
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={GZ.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, artist, genre…"
            placeholderTextColor={GZ.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
        </View>
      )}

      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {searchMode ? "GZLibrary" : "GZ100 Chart"}
        </Text>
        {!searchMode && (
          <Text style={styles.sectionSub}>Ranked by likes & ratings</Text>
        )}
      </View>

      {/* Track list */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={GZ.orange} size="large" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrack}
          contentContainerStyle={{ paddingBottom: playingTrack ? 100 : 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GZ.orange} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="musical-notes-outline" size={48} color={GZ.muted} />
              <Text style={styles.emptyText}>
                {searchMode ? "No tracks found" : "No tracks yet"}
              </Text>
            </View>
          }
        />
      )}

      {/* Mini Player */}
      {playingTrack && (
        <View style={[styles.miniPlayer, { paddingBottom: insets.bottom + 8 }]}>
          {playingTrack.coverUrl ? (
            <Image source={{ uri: playingTrack.coverUrl }} style={styles.miniCover} />
          ) : (
            <View style={[styles.miniCover, styles.coverFallback]}>
              <Ionicons name="musical-notes" size={14} color={GZ.orange} />
            </View>
          )}
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>{playingTrack.title}</Text>
            <Text style={styles.miniArtist} numberOfLines={1}>{playingTrack.artist}</Text>
          </View>
          <Pressable style={styles.miniPlayBtn} onPress={() => {
            if (isPlaying) { player.pause(); setIsPlaying(false); }
            else { player.play(); setIsPlaying(true); }
          }}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={GZ.bg} />
          </Pressable>
          <Pressable style={styles.miniClose} onPress={stopPlayer}>
            <Ionicons name="close" size={18} color={GZ.txt2} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GZ.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  menuBtn: { padding: 4, marginRight: 8 },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: GZ.txt, letterSpacing: -0.3 },
  headerRight: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GZ.surface,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: GZ.orangeBorder,
  },
  searchInput: { flex: 1, color: GZ.txt, fontSize: 15, fontFamily: "Inter_400Regular" },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: GZ.orange },
  sectionSub: { fontSize: 12, color: GZ.muted, fontFamily: "Inter_400Regular" },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GZ.card,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 10,
  },
  rankNum: { width: 22, fontSize: 13, fontFamily: "Inter_700Bold", color: GZ.muted, textAlign: "center" },
  coverWrap: { position: "relative" },
  cover: { width: 52, height: 52, borderRadius: 8 },
  coverFallback: { backgroundColor: GZ.surface, justifyContent: "center", alignItems: "center" },
  trackInfo: { flex: 1, gap: 1 },
  trackTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: GZ.txt },
  trackArtist: { fontSize: 12, color: GZ.txt2, fontFamily: "Inter_400Regular" },
  trackGenre: { fontSize: 11, color: GZ.muted, fontFamily: "Inter_400Regular" },
  ratingLabel: { fontSize: 10, color: GZ.txt2, fontFamily: "Inter_400Regular" },

  trackActions: { alignItems: "center", gap: 8 },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GZ.orangeDim,
    borderWidth: 1.5,
    borderColor: GZ.orange,
    justifyContent: "center",
    alignItems: "center",
  },
  playBtnActive: { backgroundColor: GZ.orange },
  likeBtn: { alignItems: "center", gap: 1 },
  likeCount: { fontSize: 9, color: GZ.txt2 },
  commentBtn: { padding: 2 },

  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { color: GZ.muted, fontFamily: "Inter_400Regular", fontSize: 14 },

  miniPlayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: GZ.surface,
    borderTopWidth: 1,
    borderTopColor: GZ.orangeBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  miniCover: { width: 38, height: 38, borderRadius: 6 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: GZ.txt },
  miniArtist: { fontSize: 11, color: GZ.txt2 },
  miniPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GZ.orange,
    justifyContent: "center",
    alignItems: "center",
  },
  miniClose: { padding: 4 },
});
