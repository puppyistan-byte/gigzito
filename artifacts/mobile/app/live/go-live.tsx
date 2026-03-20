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
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
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

type StreamMode = "url" | "phone";

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

  const [streamMode, setStreamMode] = useState<StreamMode>("url");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("MUSIC_GIGS");
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [micMuted, setMicMuted] = useState(false);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

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

  const requestPermissionsForPhone = async (): Promise<boolean> => {
    let cam = cameraPermission;
    let mic = micPermission;
    if (!cam?.granted) cam = await requestCameraPermission();
    if (!mic?.granted) mic = await requestMicPermission();
    return !!(cam?.granted && mic?.granted);
  };

  const handleGoLive = async () => {
    const t = title.trim();
    if (!t) { setError("Stream title is required."); return; }

    if (streamMode === "url") {
      const url = streamUrl.trim();
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
      return;
    }

    // Phone mode
    setError("");
    const granted = await requestPermissionsForPhone();
    if (!granted) {
      setError("Camera and microphone access are required to stream from your phone.");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const session = await startLive({
        title: t,
        category,
        mode: "phone",
        platform: "native",
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

  const hasCameraAccess = !!(cameraPermission?.granted && micPermission?.granted);

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      {/* Top bar */}
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
        streamMode === "phone" ? (
          /* Phone live — camera fills screen */
          <View style={s.cameraLiveWrap}>
            <CameraView
              style={s.cameraFull}
              facing={facing}
              mode="video"
            />
            {/* Overlay controls */}
            <View style={[s.cameraOverlay, { paddingBottom: insets.bottom + 24 }]}>
              {/* Top strip */}
              <View style={s.cameraTopStrip}>
                <View style={s.livePill}>
                  <View style={s.livePillDot} />
                  <Text style={s.livePillText}>LIVE</Text>
                </View>
                <View style={s.durationBadge}>
                  <View style={s.redDot} />
                  <Text style={s.durationText}>{formatDuration(duration)}</Text>
                </View>
              </View>

              {/* Stream title */}
              <Text style={s.cameraTitle} numberOfLines={2}>{title}</Text>
              <Text style={s.cameraCategory}>{category.replace(/_/g, " ")}</Text>

              {/* Bottom controls */}
              <View style={s.cameraControls}>
                {/* Flip camera */}
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setFacing(f => f === "front" ? "back" : "front"); }}
                  style={s.camBtn}
                >
                  <Feather name="refresh-cw" size={22} color="#fff" />
                </Pressable>

                {/* End stream — center */}
                <Pressable
                  onPress={handleEndStream}
                  disabled={ending}
                  style={({ pressed }) => [s.endBtnPhone, pressed && { opacity: 0.85 }]}
                >
                  <View style={s.stopIcon} />
                  <Text style={s.endBtnPhoneText}>{ending ? "Ending…" : "End Stream"}</Text>
                </Pressable>

                {/* Mic mute */}
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setMicMuted(m => !m); }}
                  style={[s.camBtn, micMuted && s.camBtnMuted]}
                >
                  <Feather name={micMuted ? "mic-off" : "mic"} size={22} color="#fff" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          /* URL live state */
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
        )
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
            {/* Mode toggle */}
            <View style={s.modeToggle}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setStreamMode("url"); setError(""); }}
                style={[s.modeBtn, streamMode === "url" && s.modeBtnActive]}
              >
                <Feather
                  name="link"
                  size={14}
                  color={streamMode === "url" ? "#fff" : Colors.textMuted}
                />
                <Text style={[s.modeBtnText, streamMode === "url" && s.modeBtnTextActive]}>
                  Stream URL
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setStreamMode("phone"); setError(""); }}
                style={[s.modeBtn, streamMode === "phone" && s.modeBtnActive]}
              >
                <Feather
                  name="video"
                  size={14}
                  color={streamMode === "phone" ? "#fff" : Colors.textMuted}
                />
                <Text style={[s.modeBtnText, streamMode === "phone" && s.modeBtnTextActive]}>
                  Stream from Phone
                </Text>
              </Pressable>
            </View>

            {/* Camera preview (phone mode only, before going live) */}
            {streamMode === "phone" ? (
              <View style={s.cameraPreviewWrap}>
                {hasCameraAccess ? (
                  <>
                    <CameraView
                      style={s.cameraPreview}
                      facing={facing}
                      mode="video"
                    />
                    <View style={s.cameraPreviewOverlay}>
                      <Pressable
                        onPress={() => { Haptics.selectionAsync(); setFacing(f => f === "front" ? "back" : "front"); }}
                        style={s.flipBtn}
                      >
                        <Feather name="refresh-cw" size={18} color="#fff" />
                      </Pressable>
                    </View>
                    <View style={s.previewLabel}>
                      <View style={s.previewDot} />
                      <Text style={s.previewLabelText}>Camera Preview</Text>
                    </View>
                  </>
                ) : (
                  <Pressable
                    style={s.permissionPrompt}
                    onPress={async () => {
                      const granted = await requestPermissionsForPhone();
                      if (!granted) {
                        setError("Camera and microphone permissions are required.");
                      } else {
                        setError("");
                      }
                    }}
                  >
                    <Feather name="camera-off" size={32} color={Colors.textMuted} />
                    <Text style={s.permissionTitle}>Camera Access Needed</Text>
                    <Text style={s.permissionSub}>
                      Tap to grant camera and microphone access so you can stream live from your phone.
                    </Text>
                    <View style={s.grantBtn}>
                      <Text style={s.grantBtnText}>Grant Access</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* Title */}
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

            {/* URL field — only shown in URL mode */}
            {streamMode === "url" ? (
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
            ) : (
              /* Phone mode info box */
              <View style={s.phoneInfoBox}>
                <Feather name="smartphone" size={14} color={Colors.purple} />
                <Text style={s.phoneInfoText}>
                  Your phone's camera and microphone will broadcast directly to ZitoTV. Make sure
                  you're in a well-lit space with a stable connection.
                </Text>
              </View>
            )}

            {/* Category */}
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
                A heartbeat runs every 30 seconds to keep your stream active on ZitoTV.
                Do not close the app while streaming.
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
              style={({ pressed }) => [
                s.goLiveBtn,
                pressed && { opacity: 0.88 },
                starting && { opacity: 0.6 },
              ]}
            >
              <Feather name={streamMode === "phone" ? "video" : "radio"} size={18} color="#fff" />
              <Text style={s.goLiveBtnText}>
                {starting ? "Starting…" : streamMode === "phone" ? "Go Live from Phone" : "Go Live"}
              </Text>
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

  /* ── Mode toggle ── */
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    paddingVertical: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.live,
  },
  modeBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  modeBtnTextActive: {
    color: "#fff",
  },

  /* ── Camera preview (setup) ── */
  cameraPreviewWrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraPreviewOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  flipBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    position: "absolute",
    bottom: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.live,
  },
  previewLabelText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Permission prompt ── */
  permissionPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 20,
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  permissionSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  grantBtn: {
    marginTop: 4,
    backgroundColor: Colors.purple,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  grantBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Phone mode info ── */
  phoneInfoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: `${Colors.purple}18`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.purple}44`,
    padding: 14,
  },
  phoneInfoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  /* ── Form ── */
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

  /* ── URL live state ── */
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
    width: 10, height: 10, borderRadius: 5,
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

  /* ── Phone live state (camera fullscreen) ── */
  cameraLiveWrap: {
    flex: 1,
    position: "relative",
  },
  cameraFull: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    inset: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    justifyContent: "space-between",
  },
  cameraTopStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.live,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  livePillDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#fff",
  },
  livePillText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cameraCategory: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  camBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  camBtnMuted: {
    backgroundColor: `${Colors.danger}99`,
    borderColor: Colors.danger,
  },
  endBtnPhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.danger,
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  stopIcon: {
    width: 14, height: 14,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  endBtnPhoneText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
