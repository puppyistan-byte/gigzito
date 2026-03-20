import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useStartLive, useEndLive, useLiveHeartbeat } from "@/hooks/useApi";
import Colors from "@/constants/colors";

const LIVE_CATEGORIES = [
  "INFLUENCER",
  "MUSIC_GIGS",
  "EVENTS",
  "CORPORATE_DEALS",
  "MARKETING",
  "COACHING",
  "COURSES",
  "CRYPTO",
  "PRODUCTS",
];

function detectPlatform(url: string): string {
  if (url.includes("youtube")) return "youtube";
  if (url.includes("twitch")) return "twitch";
  if (url.includes("tiktok")) return "tiktok";
  if (url.includes("facebook") || url.includes("fb.")) return "facebook";
  if (url.includes("instagram")) return "instagram";
  if (url.includes(".m3u8") || url.includes(".hls")) return "native";
  return "";
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GoLiveScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("MUSIC_GIGS");
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutateAsync: startLive, isPending: starting } = useStartLive();
  const { mutateAsync: endLive, isPending: ending } = useEndLive();
  const { mutateAsync: heartbeat } = useLiveHeartbeat();

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startHeartbeat = (id: number) => {
    heartbeatRef.current = setInterval(() => {
      heartbeat({ id }).catch(() => {});
    }, 30000);
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const handleGoLive = async () => {
    const t = title.trim();
    const url = streamUrl.trim();
    if (!t) { setError("Stream title is required."); return; }
    if (!url) { setError("Stream URL is required."); return; }
    if (!url.startsWith("http")) { setError("Enter a valid stream URL (https://...)."); return; }
    setError("");

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const session = await startLive({
        title: t,
        category,
        mode: url.includes(".m3u8") ? "native" : "external",
        streamUrl: url,
        platform: detectPlatform(url) || undefined,
      });
      setSessionId(session.id);
      setIsLive(true);
      setDuration(0);
      startHeartbeat(session.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message ?? "Failed to start stream. Try again.");
    }
  };

  const handleEndStream = () => {
    Alert.alert(
      "End Stream",
      "This will end your live session on ZitoTV. Are you sure?",
      [
        { text: "Keep Streaming", style: "cancel" },
        {
          text: "End Stream",
          style: "destructive",
          onPress: async () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            if (sessionId) {
              try { await endLive(sessionId); } catch {}
            }
            setIsLive(false);
            setSessionId(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <View style={s.topBar}>
        <Pressable
          onPress={() => {
            if (isLive) { handleEndStream(); return; }
            router.back();
          }}
          style={s.backBtn}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Go Live</Text>
          <Text style={s.subtitle}>Broadcast on ZitoTV</Text>
        </View>
        {isLive ? (
          <View style={s.durationBadge}>
            <View style={s.redDot} />
            <Text style={s.durationText}>{formatDuration(duration)}</Text>
          </View>
        ) : null}
      </View>

      {isLive ? (
        /* ── LIVE STATE ── */
        <View style={s.liveState}>
          <View style={s.liveCard}>
            <View style={s.liveIndicator}>
              <View style={s.livePulse} />
              <Text style={s.liveLabel}>YOU'RE LIVE</Text>
            </View>
            <Text style={s.liveTitle}>{title}</Text>
            <Text style={s.liveCategory}>{category.replace("_", " ")}</Text>

            <View style={s.liveMeta}>
              <Feather name="clock" size={13} color={Colors.textMuted} />
              <Text style={s.liveMetaText}>Duration: {formatDuration(duration)}</Text>
            </View>
            <View style={s.liveMeta}>
              <Feather name="zap" size={13} color={Colors.live} />
              <Text style={s.liveMetaText}>Heartbeat active — keeping stream live</Text>
            </View>
            <View style={s.liveMeta}>
              <Feather name="external-link" size={13} color={Colors.textMuted} />
              <Text style={s.liveMetaText} numberOfLines={1}>{streamUrl}</Text>
            </View>
          </View>

          <Pressable
            onPress={handleEndStream}
            disabled={ending}
            style={({ pressed }) => [s.endBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="square" size={16} color="#fff" />
            <Text style={s.endBtnText}>{ending ? "Ending…" : "End Stream"}</Text>
          </Pressable>
        </View>
      ) : (
        /* ── SETUP FORM ── */
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={s.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.field}>
              <Text style={s.label}>Stream Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What are you streaming today?"
                placeholderTextColor={Colors.textMuted}
                style={s.input}
                maxLength={100}
                returnKeyType="next"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Stream URL *</Text>
              <TextInput
                value={streamUrl}
                onChangeText={setStreamUrl}
                placeholder="https://youtube.com/live/..."
                placeholderTextColor={Colors.textMuted}
                style={s.input}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Text style={s.hint}>
                YouTube, Twitch, TikTok, Facebook, Instagram, or direct HLS (.m3u8)
              </Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
                <View style={s.catRow}>
                  {LIVE_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => { Haptics.selectionAsync(); setCategory(cat); }}
                      style={[s.catChip, category === cat && s.catChipActive]}
                    >
                      <Text style={[s.catChipText, category === cat && s.catChipTextActive]}>
                        {cat.replace(/_/g, " ")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.infoBox}>
              <Feather name="info" size={13} color={Colors.textMuted} />
              <Text style={s.infoText}>
                After going live, a heartbeat will run every 30 seconds to keep your stream
                active on ZitoTV. Do not close the app while streaming.
              </Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={Colors.danger} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleGoLive}
              disabled={starting}
              style={({ pressed }) => [s.goLiveBtn, pressed && { opacity: 0.88 }, starting && { opacity: 0.6 }]}
            >
              <Feather name="radio" size={18} color="#fff" />
              <Text style={s.goLiveBtnText}>{starting ? "Starting…" : "Go Live"}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    alignItems: "center", justifyContent: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.live}20`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.live}55`,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  redDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.live,
  },
  durationText: {
    color: Colors.live,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  form: {
    padding: 20,
    gap: 18,
    paddingBottom: 60,
  },
  field: { gap: 7 },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  hint: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  catScroll: { marginTop: 2 },
  catRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  catChipActive: {
    backgroundColor: `${Colors.live}18`,
    borderColor: Colors.live,
  },
  catChipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  catChipTextActive: {
    color: Colors.live,
    fontFamily: "Inter_700Bold",
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${Colors.danger}15`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.danger}44`,
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  goLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.live,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: Colors.live,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  goLiveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  liveState: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: "center",
  },
  liveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: `${Colors.live}44`,
    padding: 20,
    gap: 12,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  livePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.live,
  },
  liveLabel: {
    color: Colors.live,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  liveTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  liveCategory: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveMetaText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  endBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
