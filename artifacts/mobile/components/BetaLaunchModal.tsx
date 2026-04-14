import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import Colors from "@/constants/colors";

const VERSION_URL = "https://gigzito.com/ota-dist/android/version.json";
const APK_URL = "https://gigzito.com/ota-dist/android/gigzito.apk";

type VersionInfo = {
  versionCode: number;
  version: string;
  downloadUrl: string;
  releaseNotes?: string;
};

type DownloadState = "idle" | "downloading" | "installing" | "error";

export function BetaLaunchModal() {
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const shownThisSession = useRef(false);

  const currentCode: number =
    (Constants.expoConfig?.android?.versionCode as number) ?? 0;
  const currentVersion: string =
    Constants.expoConfig?.version ?? "unknown";

  useEffect(() => {
    if (Platform.OS !== "android" || shownThisSession.current) return;

    fetch(VERSION_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: VersionInfo) => {
        setInfo(data);
        setFetching(false);
        shownThisSession.current = true;
        setVisible(true);
      })
      .catch(() => {
        setFetching(false);
        shownThisSession.current = true;
        setVisible(true);
      });
  }, []);

  const hasUpdate = info ? info.versionCode > currentCode : false;
  const apkUrl = info?.downloadUrl ?? APK_URL;

  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDlState("downloading");

    try {
      const destFile = new File(Paths.cache, "gigzito-update.apk");
      if (destFile.exists) {
        destFile.delete();
      }

      const downloaded = await File.downloadFileAsync(apkUrl, destFile);

      setDlState("installing");

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: downloaded.uri,
        flags: 1,
        type: "application/vnd.android.package-archive",
      });

      setDlState("idle");
      setVisible(false);
    } catch {
      setDlState("error");
    }
  };

  const handleFallback = () => {
    Linking.openURL(apkUrl);
    setDlState("idle");
  };

  const handleDismiss = () => {
    Haptics.selectionAsync();
    setDlState("idle");
    setVisible(false);
  };

  if (Platform.OS !== "android") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.betaBadge}>
            <Feather name="zap" size={12} color="#fff" />
            <Text style={styles.betaBadgeText}>BETA BUILD</Text>
          </View>

          {fetching ? (
            <ActivityIndicator
              color={Colors.accent}
              style={{ marginVertical: 24 }}
            />
          ) : hasUpdate ? (
            <>
              <View style={styles.updateIconWrap}>
                <Feather name="download-cloud" size={36} color={Colors.accent} />
              </View>
              <Text style={styles.title}>New Update Available</Text>
              <Text style={styles.subtitle}>
                v{info!.version} is ready — you have v{currentVersion}
              </Text>
              {info?.releaseNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>What's new</Text>
                  <Text style={styles.notesText}>{info.releaseNotes}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.upToDateIconWrap}>
                <Feather name="check-circle" size={36} color={Colors.success} />
              </View>
              <Text style={styles.title}>You're Up to Date</Text>
              <Text style={styles.subtitle}>
                v{info?.version ?? currentVersion} is the latest beta build
              </Text>
            </>
          )}

          <View style={styles.divider} />

          {dlState === "idle" || dlState === "error" ? (
            <>
              <Text style={styles.instructionsLabel}>How to install</Text>
              <View style={styles.steps}>
                <Step n={1} text="Tap Download — the APK downloads right inside the app" />
                <Step n={2} text='When the installer opens, tap "Install"' />
                <Step n={3} text="Allow installs from unknown sources if asked" />
                <Step n={4} text="Open the app once install finishes" />
              </View>

              {dlState === "error" && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#f87171" />
                  <Text style={styles.errorText}>
                    Download failed.{" "}
                    <Text style={styles.errorLink} onPress={handleFallback}>
                      Open in browser instead
                    </Text>
                  </Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.downloadBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleDownload}
              >
                <Feather name="download" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>
                  {hasUpdate ? "Download & Install Update" : "Download Latest APK"}
                </Text>
              </Pressable>
            </>
          ) : dlState === "downloading" ? (
            <View style={styles.statusWrap}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.statusTitle}>Downloading APK…</Text>
              <Text style={styles.statusSub}>
                This may take a moment depending on your connection
              </Text>
            </View>
          ) : (
            <View style={styles.statusWrap}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={styles.statusTitle}>Opening Installer…</Text>
              <Text style={styles.statusSub}>
                Tap Install when the system prompt appears
              </Text>
            </View>
          )}

          <Pressable style={styles.dismissBtn} onPress={handleDismiss}>
            <Text style={styles.dismissBtnText}>
              {dlState !== "idle"
                ? "Cancel"
                : hasUpdate
                ? "Skip for Now"
                : "Continue to App"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    backgroundColor: Colors.darker,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  betaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 4,
  },
  betaBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  updateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${Colors.accent}20`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  upToDateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: `${Colors.success}20`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  notesBox: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 14,
    gap: 4,
  },
  notesLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  notesText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 4,
  },
  instructionsLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    alignSelf: "flex-start",
  },
  steps: {
    width: "100%",
    gap: 10,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${Colors.accent}25`,
    borderWidth: 1,
    borderColor: `${Colors.accent}50`,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stepText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  errorBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f871711a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f8717140",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  errorLink: {
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  downloadBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statusWrap: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  statusSub: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  dismissBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
  },
  dismissBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
